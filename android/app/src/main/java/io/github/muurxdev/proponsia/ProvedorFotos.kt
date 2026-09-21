package io.github.muurxdev.proponsia

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File
import java.io.FileNotFoundException

/**
 * Onde o app de câmera do Android grava a foto tirada pelo botão "Câmera" (content://<pacote>.fotos/foto-123.jpg).
 * Só dá acesso a arquivos foto-<número>.jpg da pasta de cache "camera"; a permissão é dada só para aquela foto.
 */
class ProvedorFotos : ContentProvider() {
    private fun arquivo(uri: Uri): File {
        val nome = uri.lastPathSegment ?: throw FileNotFoundException()
        if (!Regex("""^foto-\d+\.jpg$""").matches(nome)) throw FileNotFoundException(nome)
        return File(File(context!!.cacheDir, "camera").apply { mkdirs() }, nome)
    }
    override fun onCreate() = true
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor = ParcelFileDescriptor.open(arquivo(uri), ParcelFileDescriptor.parseMode(mode))
    override fun getType(uri: Uri) = "image/jpeg"
    override fun query(uri: Uri, projecao: Array<out String>?, selecao: String?, args: Array<out String>?, ordem: String?): Cursor {
        val f = arquivo(uri)
        return MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)).apply { addRow(arrayOf<Any>(f.name, f.length())) }
    }
    override fun insert(uri: Uri, valores: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selecao: String?, args: Array<out String>?) = 0
    override fun update(uri: Uri, valores: ContentValues?, selecao: String?, args: Array<out String>?) = 0
}
