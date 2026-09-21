package io.github.muurxdev.proponsia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

/**
 * Serviço em primeiro plano enquanto a Própons IA baixa algo (modelo da IA ou atualização).
 * Com ele o Android não pausa o download quando a tela apaga ou o app vai para segundo plano:
 * mostra a notificação com a barra de progresso (e o botão Cancelar) e mantém CPU e Wi-Fi acordados.
 * O download em si continua sendo feito pela MainActivity; aqui só ficam a notificação e as travas.
 */
class ServicoDownload : Service() {

    companion object {
        private const val CANAL = "downloads"
        private const val CANAL_AVISOS = "avisos"
        private const val ID = 1
        private const val ID_AVISO = 2
        private const val CANCELAR = "cancelar"
        @Volatile var aoCancelar: (() -> Unit)? = null
        @Volatile private var ultimo = 0L

        private fun canais(ctx: Context) {
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel(CANAL, "Downloads", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Progresso do download da IA e das atualizações"; setShowBadge(false)
            })
            nm.createNotificationChannel(NotificationChannel(CANAL_AVISOS, "Avisos", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Download concluído ou com problema"
            })
        }

        private fun abrirApp(ctx: Context) = PendingIntent.getActivity(ctx, 0,
            Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        private fun montar(ctx: Context, titulo: String, texto: String, pct: Double): Notification {
            canais(ctx)
            val cancelar = PendingIntent.getService(ctx, 1, Intent(ctx, ServicoDownload::class.java).setAction(CANCELAR), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            return Notification.Builder(ctx, CANAL)
                .setSmallIcon(R.drawable.ic_notificacao)
                .setColor(0xFF7C5CFF.toInt())
                .setContentTitle(titulo)
                .setContentText(texto)
                .setProgress(100, (pct.coerceIn(0.0, 1.0) * 100).toInt(), pct < 0)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setContentIntent(abrirApp(ctx))
                .addAction(Notification.Action.Builder(null, "Cancelar", cancelar).build())
                .build()
        }

        /** começa (ou continua) a mostrar o download; pct < 0 = barra sem porcentagem */
        fun iniciar(ctx: Context, titulo: String, texto: String, pct: Double = -1.0) {
            val i = Intent(ctx, ServicoDownload::class.java).putExtra("titulo", titulo).putExtra("texto", texto).putExtra("pct", pct)
            try { ctx.startForegroundService(i) } catch (_: Exception) {}
        }

        /** atualiza a barra da notificação (no máximo 1x por segundo) */
        fun progresso(ctx: Context, titulo: String, texto: String, pct: Double) {
            val agora = System.currentTimeMillis()
            if (agora - ultimo < 1000) return
            ultimo = agora
            try { ctx.getSystemService(NotificationManager::class.java).notify(ID, montar(ctx, titulo, texto, pct)) } catch (_: Exception) {}
        }

        /** termina o serviço; se houver título, deixa um aviso (ex.: "IA baixada") */
        fun terminar(ctx: Context, avisoTitulo: String? = null, avisoTexto: String = "") {
            ctx.stopService(Intent(ctx, ServicoDownload::class.java))
            aoCancelar = null
            if (avisoTitulo == null) return
            canais(ctx)
            val n = Notification.Builder(ctx, CANAL_AVISOS)
                .setSmallIcon(R.drawable.ic_notificacao).setColor(0xFF7C5CFF.toInt())
                .setContentTitle(avisoTitulo).setContentText(avisoTexto)
                .setAutoCancel(true).setContentIntent(abrirApp(ctx)).build()
            try { ctx.getSystemService(NotificationManager::class.java).notify(ID_AVISO, n) } catch (_: Exception) {}
        }
    }

    private var cpu: PowerManager.WakeLock? = null
    private var wifi: WifiManager.WifiLock? = null

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        if (i?.action == CANCELAR) { aoCancelar?.invoke(); return START_NOT_STICKY }
        val n = montar(this, i?.getStringExtra("titulo") ?: "Própons IA", i?.getStringExtra("texto") ?: "", i?.getDoubleExtra("pct", -1.0) ?: -1.0)
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else startForeground(ID, n)
        } catch (_: Exception) { stopSelf(); return START_NOT_STICKY }
        if (cpu == null) cpu = (getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ProponsIA:download").apply { setReferenceCounted(false); acquire(6 * 60 * 60 * 1000L) }
        if (wifi == null) wifi = (applicationContext.getSystemService(WIFI_SERVICE) as WifiManager).let {
            @Suppress("DEPRECATION") it.createWifiLock(if (Build.VERSION.SDK_INT >= 29) WifiManager.WIFI_MODE_FULL_HIGH_PERF else WifiManager.WIFI_MODE_FULL, "ProponsIA:download")
        }.apply { setReferenceCounted(false); acquire() }
        return START_NOT_STICKY
    }

    // Android 15: serviços de "sincronização de dados" têm limite de tempo por dia; ao acabar, sai do primeiro plano
    override fun onTimeout(startId: Int, fgsType: Int) { stopSelf() }

    override fun onDestroy() {
        try { cpu?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
        try { wifi?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
        cpu = null; wifi = null
        super.onDestroy()
    }
}
