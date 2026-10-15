import sys,joblib
from pathlib import Path
m=joblib.load(Path(__file__).with_name('model.joblib'));text=' '.join(sys.argv[1:]);print(m.predict([text])[0])
