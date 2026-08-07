package com.nkb.itms.agent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.i(TAG, "Device booted. Re-enforcing NKB Work Mode Security Policies...")
            PolicyManager.getInstance(context).enforceActivePolicy()
            SocketClient(context).connect()
        }
    }

    companion object {
        private const val TAG = "NKB_ITMS_BootReceiver"
    }
}
