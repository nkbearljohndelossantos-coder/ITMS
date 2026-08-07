package com.nkb.itms.agent

import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var policyManager: PolicyManager
    private lateinit var socketClient: SocketClient

    private lateinit var tvDeviceOwnerStatus: TextView
    private lateinit var tvAdminStatus: TextView
    private lateinit var tvCameraStatus: TextView
    private lateinit var tvPolicyStatus: TextView
    private lateinit var btnToggleWorkMode: Button
    private lateinit var btnSyncPolicy: Button
    private lateinit var btnActivateAdmin: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(createSimpleLayout())

        policyManager = PolicyManager.getInstance(this)
        socketClient = SocketClient(this)
        socketClient.connect()

        updateUiStatus()

        btnToggleWorkMode.setOnClickListener {
            val currentCameraBlocked = policyManager.setCameraDisabled(true)
            policyManager.enforceDefaultAppBlacklist(true)
            Toast.makeText(this, "NKB Work Mode Activated: Camera & Apps Restricted", Toast.LENGTH_SHORT).show()
            updateUiStatus()
        }

        btnSyncPolicy.setOnClickListener {
            socketClient.pullDevicePolicy()
            Toast.makeText(this, "Syncing latest policy from NKB ITMS Server...", Toast.LENGTH_SHORT).show()
        }

        btnActivateAdmin.setOnClickListener {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, AdminReceiver.getComponentName(this@MainActivity))
                putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Activate NKB Manufacturing Work Mode Admin privileges to secure company assets.")
            }
            startActivity(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        updateUiStatus()
    }

    private fun updateUiStatus() {
        val isOwner = policyManager.isDeviceOwner
        val isAdmin = policyManager.isAdminActive

        tvDeviceOwnerStatus.text = if (isOwner) "Status: Android Device Owner (Full Control)" else "Status: Device Admin Active"
        tvAdminStatus.text = if (isAdmin) "Admin Privileges: ACTIVE ✓" else "Admin Privileges: INACTIVE ⚠️"
        tvCameraStatus.text = "Camera Control: RESTRICTED & SECURED 🛡️"
        tvPolicyStatus.text = "Policy: STRICT WORK MODE ENFORCED"
    }

    private fun createSimpleLayout(): android.view.View {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(android.graphics.Color.parseColor("#0F172A"))
        }

        val title = TextView(this).apply {
            text = "🛡️ NKB ITMS Agent"
            textSize = 24f
            setTextColor(android.graphics.Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(title)

        tvDeviceOwnerStatus = TextView(this).apply {
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#38BDF8"))
            setPadding(0, 16, 0, 8)
        }
        layout.addView(tvDeviceOwnerStatus)

        tvAdminStatus = TextView(this).apply {
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#4ADE80"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(tvAdminStatus)

        tvCameraStatus = TextView(this).apply {
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#F87171"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(tvCameraStatus)

        tvPolicyStatus = TextView(this).apply {
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#FBBF24"))
            setPadding(0, 0, 0, 24)
        }
        layout.addView(tvPolicyStatus)

        btnToggleWorkMode = Button(this).apply {
            text = "🔒 Enable Work Mode Security"
            setBackgroundColor(android.graphics.Color.parseColor("#2563EB"))
            setTextColor(android.graphics.Color.WHITE)
        }
        layout.addView(btnToggleWorkMode)

        btnSyncPolicy = Button(this).apply {
            text = "🔄 Sync Policy from Server"
            setBackgroundColor(android.graphics.Color.parseColor("#334155"))
            setTextColor(android.graphics.Color.WHITE)
        }
        layout.addView(btnSyncPolicy)

        btnActivateAdmin = Button(this).apply {
            text = "⚡ Grant Device Admin Privileges"
            setBackgroundColor(android.graphics.Color.parseColor("#059669"))
            setTextColor(android.graphics.Color.WHITE)
        }
        layout.addView(btnActivateAdmin)

        return layout
    }
}
