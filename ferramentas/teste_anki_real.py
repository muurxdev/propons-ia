# Importa o .apkg da Própons com o próprio Anki (pacote "anki" do PyPI, o mesmo motor do Anki de computador).
# Uso: pip install anki && ANKI_SAIDA=/tmp/p.apkg node src/testes/teste_anki.js && python3 ferramentas/teste_anki_real.py /tmp/p.apkg
import sys, tempfile, os
from anki.collection import Collection
from anki.import_export_pb2 import ImportAnkiPackageRequest, ImportAnkiPackageOptions
pasta = tempfile.mkdtemp()
col = Collection(os.path.join(pasta, "colecao.anki2"))
col.import_anki_package(ImportAnkiPackageRequest(package_path=sys.argv[1], options=ImportAnkiPackageOptions(with_scheduling=False)))
notas = col.find_notes("")
baralhos = [d.name for d in col.decks.all_names_and_ids()]
frentes = [col.get_note(n)["Frente"] for n in notas]
print("notas:", len(notas), "| baralhos:", baralhos, "| cartões:", col.card_count())
assert len(notas) == 3, "o Anki não importou as 3 notas"
assert col.card_count() == 3, "o Anki não criou os 3 cartões"
assert "Própons teste" in baralhos, "o baralho não veio com o nome"
assert any("fotossíntese" in f for f in frentes), frentes
col.close()
print("o Anki importou o baralho da Própons")
