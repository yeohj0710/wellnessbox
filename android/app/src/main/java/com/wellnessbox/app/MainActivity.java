package com.wellnessbox.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        WebView webView = (this.bridge != null) ? this.bridge.getWebView() : null;

        if (webView != null && webView.canGoBack()) {
            // WebView 히스토리가 있으면 뒤로가기
            webView.goBack();
        } else {
            // 더 이상 뒤로 갈 데 없으면 종료 확인 다이얼로그
            showExitDialog();
        }
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
                .setTitle("다음에 또 봐요!")
                .setMessage("앱을 종료할까요?")
                .setNegativeButton("취소", null)
                .setPositiveButton("종료", (dialog, which) -> {
                    finish();
                })
                .create()
                .show();
    }
}
