package com.enzolabs.lifecatalog;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Matrix;
import androidx.exifinterface.media.ExifInterface;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.nio.FloatBuffer;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline salient-object segmentation. No Google Play services or network calls. */
@CapacitorPlugin(name = "SubjectCutout")
public class SubjectCutoutPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private OrtSession session;
    private final OrtEnvironment environment = OrtEnvironment.getEnvironment();

    @PluginMethod public void availability(PluginCall call) {
        JSObject value = new JSObject();
        value.put("available", true);
        value.put("engine", "U2NetP · ONNX Runtime · offline");
        call.resolve(value);
    }

    @PluginMethod public void segment(PluginCall call) {
        String source = call.getString("base64");
        if (source == null || source.length() > 32 * 1024 * 1024) {
            call.reject("图片为空或过大，请选择较小的照片", "INVALID_IMAGE"); return;
        }
        worker.execute(() -> {
            Bitmap original = null, resized = null, mask = null, scaledMask = null, output = null;
            try {
                byte[] bytes = Base64.decode(source, Base64.DEFAULT);
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
                if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw new IllegalArgumentException("无法读取照片");
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inPreferredConfig = Bitmap.Config.ARGB_8888;
                options.inSampleSize = 1;
                while (Math.max(bounds.outWidth, bounds.outHeight) / options.inSampleSize > 2560) options.inSampleSize *= 2;
                original = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
                if (original == null) throw new IllegalArgumentException("无法读取照片");
                ExifInterface exif = new ExifInterface(new ByteArrayInputStream(bytes));
                int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                Matrix transform = new Matrix();
                switch (orientation) {
                    case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: transform.setScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_180: transform.setRotate(180); break;
                    case ExifInterface.ORIENTATION_FLIP_VERTICAL: transform.setScale(1, -1); break;
                    case ExifInterface.ORIENTATION_TRANSPOSE: transform.setRotate(90); transform.postScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_90: transform.setRotate(90); break;
                    case ExifInterface.ORIENTATION_TRANSVERSE: transform.setRotate(270); transform.postScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_270: transform.setRotate(270); break;
                    default: break;
                }
                if (!transform.isIdentity()) {
                    Bitmap upright = Bitmap.createBitmap(original, 0, 0, original.getWidth(), original.getHeight(), transform, true);
                    if (upright != original) original.recycle();
                    original = upright;
                }
                if (session == null) {
                    try (InputStream model = getContext().getAssets().open("models/u2netp.onnx");
                         ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                         OrtSession.SessionOptions sessionOptions = new OrtSession.SessionOptions()) {
                        byte[] chunk = new byte[8192]; int size;
                        while ((size = model.read(chunk)) != -1) buffer.write(chunk, 0, size);
                        sessionOptions.setIntraOpNumThreads(2);
                        sessionOptions.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                        session = environment.createSession(buffer.toByteArray(), sessionOptions);
                    }
                }
                // Composite transparency onto white for model analysis; preserve source alpha in output.
                resized = Bitmap.createBitmap(320, 320, Bitmap.Config.ARGB_8888);
                Canvas analysis = new Canvas(resized); analysis.drawColor(Color.WHITE);
                Paint filter = new Paint(Paint.FILTER_BITMAP_FLAG);
                analysis.drawBitmap(original, null, new android.graphics.Rect(0, 0, 320, 320), filter);
                int[] rgb = new int[320 * 320]; resized.getPixels(rgb, 0, 320, 0, 0, 320, 320);
                float maximum = 1;
                for (int pixel : rgb) maximum = Math.max(maximum, Math.max(Color.red(pixel), Math.max(Color.green(pixel), Color.blue(pixel))));
                float[] input = new float[3 * rgb.length];
                float[] mean = {0.485f, 0.456f, 0.406f}, std = {0.229f, 0.224f, 0.225f};
                for (int p = 0; p < rgb.length; p++) {
                    input[p] = (Color.red(rgb[p]) / maximum - mean[0]) / std[0];
                    input[rgb.length + p] = (Color.green(rgb[p]) / maximum - mean[1]) / std[1];
                    input[2 * rgb.length + p] = (Color.blue(rgb[p]) / maximum - mean[2]) / std[2];
                }
                try (OnnxTensor tensor = OnnxTensor.createTensor(environment, FloatBuffer.wrap(input), new long[]{1, 3, 320, 320});
                     OrtSession.Result result = session.run(Collections.singletonMap(session.getInputNames().iterator().next(), tensor))) {
                    float[][][][] predictions = (float[][][][]) result.get(0).getValue();
                    float min = Float.POSITIVE_INFINITY, max = Float.NEGATIVE_INFINITY;
                    for (float[] row : predictions[0][0]) for (float v : row) { min = Math.min(min, v); max = Math.max(max, v); }
                    if (!Float.isFinite(min) || !Float.isFinite(max) || max - min < 0.00001f) throw new IllegalStateException("没有识别到清晰主体，请换个背景再试");
                    int[] alpha = new int[rgb.length];
                    for (int y = 0; y < 320; y++) for (int x = 0; x < 320; x++) {
                        int v = Math.round(255 * (predictions[0][0][y][x] - min) / (max - min));
                        alpha[y * 320 + x] = Color.rgb(v, v, v);
                    }
                    mask = Bitmap.createBitmap(alpha, 320, 320, Bitmap.Config.ARGB_8888);
                }
                scaledMask = Bitmap.createScaledBitmap(mask, original.getWidth(), original.getHeight(), true);
                int width = original.getWidth(), height = original.getHeight();
                int[] sourcePixels = new int[width * height], maskPixels = new int[width * height];
                original.getPixels(sourcePixels, 0, width, 0, 0, width, height);
                scaledMask.getPixels(maskPixels, 0, width, 0, 0, width, height);
                for (int p = 0; p < sourcePixels.length; p++) {
                    int a = Color.red(maskPixels[p]) * Color.alpha(sourcePixels[p]) / 255;
                    sourcePixels[p] = (a << 24) | (sourcePixels[p] & 0x00ffffff);
                }
                output = Bitmap.createBitmap(sourcePixels, width, height, Bitmap.Config.ARGB_8888);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                output.compress(Bitmap.CompressFormat.PNG, 100, png);
                JSObject value = new JSObject();
                value.put("dataUrl", "data:image/png;base64," + Base64.encodeToString(png.toByteArray(), Base64.NO_WRAP));
                value.put("width", width); value.put("height", height);
                value.put("engine", "U2NetP");
                call.resolve(value);
            } catch (Exception e) {
                call.reject("抠图失败：" + (e.getMessage() == null ? "请换张照片重试" : e.getMessage()), "SEGMENTATION_FAILED", e);
            } finally {
                if (output != null) output.recycle();
                if (scaledMask != null && scaledMask != mask) scaledMask.recycle();
                if (mask != null) mask.recycle();
                if (resized != null) resized.recycle();
                if (original != null) original.recycle();
            }
        });
    }
    @Override protected void handleOnDestroy() {
        worker.execute(() -> { try { if (session != null) session.close(); } catch (Exception ignored) {} });
        worker.shutdown();
        super.handleOnDestroy();
    }
}
