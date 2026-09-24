package io.github.muurxdev.proponsia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Serviço em primeiro plano enquanto a IA termina uma resposta com o app em segundo plano (tela apagada, outro app).
 * Tipo "specialUse" (Android 14+): a geração acontece no próprio aparelho e não é sincronização de dados — o tipo
 * "dataSync" do ServicoDownload tem limite de tempo por dia no Android 15, que os downloads grandes já consomem.
 */
class ServicoResposta : Service() {

    companion object {
        private const val CANAL = "resposta"
        private const val ID = 3

        fun iniciar(ctx: Context) {
            try { ctx.startForegroundService(Intent(ctx, ServicoResposta::class.java)) } catch (_: Exception) {}
        }
        fun terminar(ctx: Context) { ctx.stopService(Intent(ctx, ServicoResposta::class.java)) }
    }

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CANAL, "Respostas", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Aparece enquanto a IA termina uma resposta com o app em segundo plano"; setShowBadge(false)
        })
        val abrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = Notification.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_notificacao).setColor(0xFF7C5CFF.toInt())
            .setContentTitle("Própons IA").setContentText("Respondendo…")
            .setProgress(0, 0, true).setOngoing(true).setOnlyAlertOnce(true)
            .setContentIntent(abrir).build()
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(ID, n)
        } catch (_: Exception) { stopSelf() }
        return START_NOT_STICKY
    }
}
