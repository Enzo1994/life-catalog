package com.enzolabs.lifecatalog;

import static org.junit.Assert.*;
import android.content.Context;
import android.graphics.*;
import android.util.Base64;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SubjectCutoutTest {
    @Test public void nativeUiLoadsAndBridgeIsExposed() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        boolean loaded=false;
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            for(int attempt=0;attempt<60;attempt++){
                CountDownLatch read=new CountDownLatch(1);
                AtomicReference<String> state=new AtomicReference<>();
                scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                    "({title:document.querySelector('main h1')?.textContent||'',native:!!window.Capacitor?.isNativePlatform?.(),plugin:!!window.Capacitor?.isPluginAvailable?.('SubjectCutout'),className:document.documentElement?.className||'',headingHeight:document.querySelector('main h1')?.getBoundingClientRect().height||0,viewport:innerHeight})",
                    value->{state.set(value);read.countDown();}));
                assertTrue(read.await(5,TimeUnit.SECONDS));
                org.json.JSONObject value=new org.json.JSONObject(state.get());
                if("人生图鉴".equals(value.optString("title"))){
                    System.out.println("WEB_LAYOUT="+value.toString());
                    assertTrue(value.getBoolean("native"));assertTrue(value.getBoolean("plugin"));assertTrue(value.getString("className").contains("native-app"));
                    assertTrue("标题布局不可见",value.getDouble("headingHeight")>20);assertTrue(value.getInt("viewport")>200);
                    loaded=true;break;
                }
                Thread.sleep(150);
            }
            assertTrue("原生 WebView 首页未加载或桥接未注册",loaded);
            CountDownLatch painted=new CountDownLatch(1);
            scenario.onActivity(activity -> activity.getBridge().getWebView().postVisualStateCallback(1,new android.webkit.WebView.VisualStateCallback(){@Override public void onComplete(long id){painted.countDown();}}));
            assertTrue("WebView 未完成首帧绘制",painted.await(10,TimeUnit.SECONDS));
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            android.os.SystemClock.sleep(400);
            scenario.onActivity(activity -> {
                android.webkit.WebView web=activity.getBridge().getWebView();
                System.out.println("NATIVE_VIEW="+web.getWidth()+"x"+web.getHeight()+", shown="+web.isShown()+", focus="+activity.hasWindowFocus()+", alpha="+web.getAlpha());
                Bitmap rendered=Bitmap.createBitmap(web.getWidth(),web.getHeight(),Bitmap.Config.ARGB_8888);
                web.draw(new Canvas(rendered));
                try(FileOutputStream out=new FileOutputStream(new File(context.getExternalFilesDir(null),"native-webview.png"))){rendered.compress(Bitmap.CompressFormat.PNG,100,out);}catch(Exception e){throw new RuntimeException(e);}finally{rendered.recycle();}
            });
            Bitmap screen=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            if(screen!=null){try(FileOutputStream out=new FileOutputStream(new File(context.getExternalFilesDir(null),"native-home.png"))){screen.compress(Bitmap.CompressFormat.PNG,100,out);}screen.recycle();}
        }
    }
    static class CaptureCall extends PluginCall {
        final CountDownLatch completed = new CountDownLatch(1);
        JSObject value; String error;
        CaptureCall(JSObject data) { super(null, "SubjectCutout", "test", "segment", data); }
        @Override public void resolve(JSObject value) { this.value = value; completed.countDown(); }
        @Override public void reject(String message, String code, Exception e, JSObject data) { error = code + ": " + message; completed.countDown(); }
    }
    @Test public void offlineModelExtractsTransparentMugThroughRegisteredPlugin() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Bitmap sprite;
        try (InputStream in = context.getAssets().open("public/assets/objects.png")) { sprite = BitmapFactory.decodeStream(in); }
        Bitmap photo = Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(photo); canvas.drawColor(Color.WHITE);
        canvas.drawBitmap(sprite, new Rect(0,0,512,512), new Rect(0,0,512,512), new Paint(Paint.FILTER_BITMAP_FLAG));
        ByteArrayOutputStream encoded = new ByteArrayOutputStream(); photo.compress(Bitmap.CompressFormat.PNG,100,encoded);
        JSObject args = new JSObject(); args.put("base64",Base64.encodeToString(encoded.toByteArray(),Base64.NO_WRAP));
        CaptureCall call = new CaptureCall(args);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull(activity.getBridge().getPlugin("SubjectCutout"));
                SubjectCutoutPlugin plugin = (SubjectCutoutPlugin) activity.getBridge().getPlugin("SubjectCutout").getInstance();
                plugin.segment(call);
            });
            assertTrue("离线模型未在 60 秒内返回",call.completed.await(60,TimeUnit.SECONDS));
            assertNull(call.error); assertNotNull(call.value);
            String data = call.value.getString("dataUrl"); assertTrue(data.startsWith("data:image/png;base64,"));
            byte[] bytes = Base64.decode(data.substring(data.indexOf(',')+1),Base64.DEFAULT);
            Bitmap result = BitmapFactory.decodeByteArray(bytes,0,bytes.length);
            assertEquals(512,result.getWidth()); assertEquals(512,result.getHeight());
            int transparent=0,opaque=0;
            for(int y=0;y<512;y++)for(int x=0;x<512;x++){int alpha=Color.alpha(result.getPixel(x,y));if(alpha<25)transparent++;if(alpha>230)opaque++;}
            assertTrue("背景未被去除",transparent>512*512/8);
            assertTrue("主体被错误抹除",opaque>512*512/10);
            assertTrue("画面角落应为透明",Color.alpha(result.getPixel(0,0))<25);
            assertTrue("杯子中心应保留",Color.alpha(result.getPixel(230,260))>200);
            File output = context.getExternalFilesDir(null);
            try(FileOutputStream file=new FileOutputStream(new File(output,"cutout-test-source.png"))){photo.compress(Bitmap.CompressFormat.PNG,100,file);}
            try(FileOutputStream file=new FileOutputStream(new File(output,"cutout-test-result.png"))){file.write(bytes);}
            result.recycle();
        }
        photo.recycle(); sprite.recycle();
    }
    @Test public void invalidInputFailsWithoutReplacingOriginal() throws Exception {
        CaptureCall call = new CaptureCall(new JSObject());
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(activity -> ((SubjectCutoutPlugin)activity.getBridge().getPlugin("SubjectCutout").getInstance()).segment(call));
            assertTrue(call.completed.await(5,TimeUnit.SECONDS));
            assertNotNull(call.error);assertTrue(call.error.startsWith("INVALID_IMAGE"));assertNull(call.value);
        }
    }
}
