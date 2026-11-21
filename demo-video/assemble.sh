#!/usr/bin/env bash
# Assemble role clips + title cards + background bed into parche-demo.mp4.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIPS="$ROOT/clips"
WORK="$ROOT/work"
BED="$ROOT/assets/bg-bed.m4a"
OUT="$ROOT/parche-demo.mp4"
mkdir -p "$WORK"

make_title() {
  local name="$1" line1="$2" line2="$3" secs="$4"
  local png="$WORK/${name}.png"
  magick -size 1280x720 "xc:#0B0B0B" \
    -font "/System/Library/Fonts/Supplemental/Arial Bold.ttf" -fill white -pointsize 64 -gravity center \
    -annotate +0-36 "$line1" \
    -font "/System/Library/Fonts/Supplemental/Arial.ttf" -fill "#AAAAAA" -pointsize 28 \
    -annotate +0+48 "$line2" \
    "$png"
  ffmpeg -y -loop 1 -i "$png" -t "$secs" -c:v libx264 -pix_fmt yuv420p -r 30 "$WORK/${name}.mp4"
}

echo "== titles =="
make_title intro "PARCHE" "Demo de producto" 4
make_title t_cliente "Cliente" "Explorar · compra · boletas QR" 3
make_title t_promotor "Promotor" "Operar · métricas · staff" 3
make_title t_door "Puerta" "Pegar código · ingreso · aforo" 3
make_title t_admin "Admin" "Cola de aprobación" 3
make_title outro "PARCHE" "ata · promoter · door · admin @parche.test" 4

echo "== convert clips =="
for role in cliente promotor door admin; do
  ffmpeg -y -i "$CLIPS/${role}.webm" -c:v libx264 -pix_fmt yuv420p -r 30 -an "$WORK/${role}.mp4"
done

echo "== concat =="
cat > "$WORK/list.txt" <<EOF
file 'intro.mp4'
file 't_cliente.mp4'
file 'cliente.mp4'
file 't_promotor.mp4'
file 'promotor.mp4'
file 't_door.mp4'
file 'door.mp4'
file 't_admin.mp4'
file 'admin.mp4'
file 'outro.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/raw.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/raw.mp4")
TARGET=180
FACTOR=$(python3 -c "d=float('$DUR'); t=float('$TARGET'); print(d/t if d < t else 1.0)")
echo "duration=${DUR}s factor=${FACTOR}"

if awk "BEGIN{exit !($FACTOR < 0.999)}"; then
  echo "== stretch toward ${TARGET}s =="
  ffmpeg -y -i "$WORK/raw.mp4" -filter:v "setpts=${FACTOR}*PTS" -an -c:v libx264 -pix_fmt yuv420p "$WORK/silent.mp4"
else
  cp "$WORK/raw.mp4" "$WORK/silent.mp4"
fi

VDUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/silent.mp4")
echo "== mix background bed (${VDUR}s) =="
if [[ ! -f "$BED" ]]; then
  echo "missing $BED" >&2
  exit 1
fi
# Loop/trim bed, fade in/out, keep under voice/UI (~18% level)
ffmpeg -y -i "$WORK/silent.mp4" -stream_loop -1 -i "$BED" \
  -filter_complex "[1:a]atrim=0:${VDUR},afade=t=in:st=0:d=2,afade=t=out:st=$(python3 -c "print(max(0, float('$VDUR')-3))"):d=3,volume=0.18[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest "$OUT"

ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT" | awk '{printf "FINAL %.1fs -> %s\n", $1, "'"$OUT"'"}'
ls -lh "$OUT"
