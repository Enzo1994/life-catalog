package com.enzolabs.lifecatalog;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SubjectCutoutPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
