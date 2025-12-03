package com.wellnessbox.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
    }

    private void configureSystemBars() {
        Window window = getWindow();

        // 시스템이 status bar 영역을 제외한 곳에 WebView를 배치하도록 맡김
        WindowCompat.setDecorFitsSystemWindows(window, true);

        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            int systemBarColor = ContextCompat.getColor(this, R.color.system_bar_background);
            window.setStatusBarColor(systemBarColor);
            window.setNavigationBarColor(systemBarColor);
        }

        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }
    }

    @Override
    public void onBackPressed() {
        WebView webView = (this.bridge != null) ? this.bridge.getWebView() : null;

        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            showExitDialog();
        }
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
                .setTitle("다음에 또 봐요!")
                .setMessage("앱을 종료할까요?")
                .setNegativeButton("취소", null)
                .setPositiveButton("종료", (dialog, which) -> finish())
                .create()
                .show();
    }
}
