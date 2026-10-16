package demoseed

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"math"
	"strings"
	"unicode"

	"golang.org/x/image/draw"
	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

// flyerStyle picks a Dice-like poster composition. Each demo event gets one.
type flyerStyle int

const (
	styleNeonOrb flyerStyle = iota
	styleMinimal
	styleGrain
	styleShards
	styleWire
	styleBands
	styleSilhouette
)

type flyerTheme struct {
	top, mid, bottom, accent color.RGBA
}

type flyerMeta struct {
	title string
	venue string
	genre string
	theme flyerTheme
	style flyerStyle
}

const flyerW, flyerH = 800, 1000

// flyerPNG builds a portrait gig flyer meant to read at card size on a dark UI:
// bright midtones, a strong central hook, and title locked in the upper third
// (where the landing card scrim is still transparent).
func flyerPNG(m flyerMeta) []byte {
	dst := image.NewRGBA(image.Rect(0, 0, flyerW, flyerH))
	th := m.theme
	title := strings.TrimSpace(m.title)
	if title == "" {
		title = "PARCHE"
	}
	venue := strings.TrimSpace(m.venue)
	if venue == "" {
		venue = "Bogotá"
	}
	genre := strings.ToUpper(strings.TrimSpace(m.genre))
	if genre == "" {
		genre = "LIVE"
	}

	switch m.style {
	case styleMinimal:
		paintMinimal(dst, th, title, venue, genre)
	case styleGrain:
		paintGrain(dst, th, title, venue, genre)
	case styleShards:
		paintShards(dst, th, title, venue, genre)
	case styleWire:
		paintWire(dst, th, title, venue, genre)
	case styleBands:
		paintBands(dst, th, title, venue, genre)
	case styleSilhouette:
		paintSilhouette(dst, th, title, venue, genre)
	default:
		paintNeonOrb(dst, th, title, venue, genre)
	}

	var buf bytes.Buffer
	_ = png.Encode(&buf, dst)
	return buf.Bytes()
}

func paintNeonOrb(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	// Punchy dark→accent mid so the card isn't a black hole under the scrim.
	fillVerticalGradient(dst, th.top, punch(th.mid, th.accent, 0.35), th.bottom)
	addRadialGlow(dst, flyerW/2, 360, 420, th.accent, 0.85)
	addRadialGlow(dst, flyerW/2, 360, 160, inkWhite(), 0.35)

	cx, cy, r := flyerW/2, 360, 230.0
	// Filled core
	for y := -int(r); y <= int(r); y++ {
		for x := -int(r); x <= int(r); x++ {
			d := math.Sqrt(float64(x*x)+float64(y*y)*1.05) / r
			if d > 1 {
				continue
			}
			a := (1 - d) * (1 - d) * 0.9
			setSoft(dst, cx+x, cy+y, blendRGBA(th.accent, inkWhite(), 0.25*(1-d)), a)
		}
	}
	// Wire rings
	for a := 0.0; a < math.Pi*2; a += 0.02 {
		x := cx + int(math.Cos(a)*r)
		y := cy + int(math.Sin(a)*r*0.92)
		setSoft(dst, x, y, inkWhite(), 0.95)
		setSoft(dst, x+1, y, th.accent, 0.7)
	}
	for lat := -0.7; lat <= 0.7; lat += 0.18 {
		rr := r * math.Cos(lat*math.Pi/2)
		yy := cy + int(lat*r)
		for a := 0.0; a < math.Pi*2; a += 0.03 {
			x := cx + int(math.Cos(a)*rr)
			setSoft(dst, x, yy, inkWhite(), 0.55)
		}
	}
	addFilmGrain(dst, 8, hash32(title))

	drawSmallLabel(dst, genre, 56, 78, th.accent)
	drawTitleBlock(dst, title, 120, inkWhite(), th.accent, 70)
	drawMetaRow(dst, strings.ToUpper(venue), 56, flyerH-90, inkMuted())
	drawCornerMark(dst, th.accent)
}

func paintMinimal(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	// Light paper poster — high contrast on dark landing cards.
	bg := color.RGBA{236, 232, 224, 255}
	ink := color.RGBA{18, 18, 22, 255}
	fillSolid(dst, bg)

	cx, cy := flyerW/2, 520
	// Large falling silhouette / ink blot
	for y := -220; y < 260; y++ {
		w := 28 + int(math.Abs(float64(y))*0.1)
		if y > 30 {
			w = 56 + (y-30)/2
		}
		for x := -w; x <= w; x++ {
			if float64(x*x)+float64(y*y)*0.35 > float64(w*w) {
				continue
			}
			setSoft(dst, cx+x, cy+y, th.accent, 0.98)
		}
	}
	// Accent bar under title
	draw.Draw(dst, image.Rect(flyerW/2-120, 210, flyerW/2+120, 218), &image.Uniform{C: th.accent}, image.Point{}, draw.Src)

	drawCenteredLines(dst, splitTitle(title), flyerW/2, 120, ink, 64)
	drawMetaRow(dst, strings.ToUpper(genre)+"  —  "+strings.ToUpper(venue), 56, flyerH-88, color.RGBA{60, 60, 70, 255})
}

func paintGrain(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	base := punch(th.mid, th.accent, 0.25)
	fillVerticalGradient(dst, th.top, base, th.bottom)
	seed := hash32(title + venue)

	blobs := []struct {
		x, y, r float64
		c       color.RGBA
		a       float64
	}{
		{240, 300, 340, th.accent, 0.75},
		{580, 480, 380, lerpRGBA(th.accent, color.RGBA{255, 90, 180, 255}, 0.55), 0.65},
		{400, 720, 300, lerpRGBA(th.accent, color.RGBA{255, 210, 70, 255}, 0.45), 0.55},
		{120, 640, 220, inkWhite(), 0.2},
	}
	for _, b := range blobs {
		for y := 0; y < flyerH; y++ {
			for x := 0; x < flyerW; x++ {
				dx := float64(x) - b.x
				dy := float64(y) - b.y
				d := math.Sqrt(dx*dx+dy*dy) / b.r
				if d >= 1 {
					continue
				}
				n := noise2(x, y, seed) * 0.3
				a := (1-d)*(1-d)*b.a*(0.8+n)
				dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), b.c, clamp01(a)))
			}
		}
	}
	addFilmGrain(dst, 12, seed)

	// Title plate so type always pops on busy texture
	draw.Draw(dst, image.Rect(40, 70, flyerW-40, 250), &image.Uniform{C: color.RGBA{0, 0, 0, 255}}, image.Point{}, draw.Src)
	for y := 70; y < 250; y++ {
		for x := 40; x < flyerW-40; x++ {
			dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), color.RGBA{8, 10, 14, 255}, 0.72))
		}
	}
	drawSmallLabel(dst, genre, 56, 100, th.accent)
	drawTitleBlock(dst, title, 140, inkWhite(), th.accent, 64)
	drawMetaRow(dst, strings.ToUpper(venue), 56, flyerH-90, inkWhite())
}

func paintShards(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	fillSolid(dst, th.top)
	addRadialGlow(dst, flyerW/2, 420, 360, punch(th.mid, th.accent, 0.4), 0.7)
	seed := hash32(title)
	cx, cy := float64(flyerW/2), 430.0
	for i := 0; i < 36; i++ {
		ang := float64(i)*0.38 + float64(seed%9)*0.08
		span := 120.0 + float64((seed>>uint(i%8))%140)
		c := th.accent
		switch i % 4 {
		case 0:
			c = lerpRGBA(th.accent, inkWhite(), 0.45)
		case 1:
			c = punch(th.mid, th.accent, 0.5)
		case 2:
			c = lerpRGBA(th.accent, color.RGBA{255, 120, 40, 255}, 0.35)
		}
		drawTriangle(dst,
			cx, cy,
			cx+math.Cos(ang)*span, cy+math.Sin(ang)*span*1.15,
			cx+math.Cos(ang+0.2)*span*0.75, cy+math.Sin(ang+0.2)*span*0.9,
			c, 0.92)
	}
	addFilmGrain(dst, 7, seed)
	drawTitleBlock(dst, title, 80, inkWhite(), th.accent, 66)
	drawMetaRow(dst, strings.ToUpper(genre)+" · "+strings.ToUpper(venue), 56, flyerH-90, inkMuted())
}

func paintWire(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	fillVerticalGradient(dst, th.bottom, punch(th.top, th.accent, 0.2), th.mid)
	addRadialGlow(dst, flyerW/2, 280, 300, th.accent, 0.55)

	horizon := 560
	for i := 0; i < 22; i++ {
		y := horizon + i*22
		alpha := 0.15 + float64(i)*0.025
		col := blendRGBA(th.top, th.accent, clamp01(alpha))
		for x := 30; x < flyerW-30; x++ {
			setSoft(dst, x, y, col, 0.7)
		}
	}
	for i := -12; i <= 12; i++ {
		x0 := flyerW/2 + i*32
		for y := horizon; y < flyerH-36; y++ {
			t := float64(y-horizon) / 400
			x := x0 + int(float64(i)*t*22)
			setSoft(dst, x, y, th.accent, 0.35+t*0.45)
		}
	}
	// Horizon sun
	addRadialGlow(dst, flyerW/2, horizon-20, 140, th.accent, 0.9)
	addRadialGlow(dst, flyerW/2, horizon-20, 60, inkWhite(), 0.5)

	drawCenteredLines(dst, splitTitle(title), flyerW/2, 140, inkWhite(), 68)
	drawSmallLabel(dst, genre, flyerW/2-50, 100, th.accent)
	drawMetaRow(dst, strings.ToUpper(venue), 56, flyerH-88, inkMuted())
}

func paintBands(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	bands := []color.RGBA{
		punch(th.top, th.accent, 0.15),
		lerpRGBA(th.top, th.mid, 0.45),
		punch(th.mid, th.accent, 0.25),
		th.accent,
		lerpRGBA(th.accent, th.bottom, 0.25),
		th.bottom,
	}
	bh := flyerH / len(bands)
	for i, c := range bands {
		y0 := i * bh
		y1 := y0 + bh
		if i == len(bands)-1 {
			y1 = flyerH
		}
		for y := y0; y < y1; y++ {
			u := float64(y-y0) / float64(max(1, y1-y0))
			next := c
			if i+1 < len(bands) {
				next = bands[i+1]
			}
			row := lerpRGBA(c, next, u*0.55)
			for x := 0; x < flyerW; x++ {
				dst.SetRGBA(x, y, row)
			}
		}
	}
	addFilmGrain(dst, 9, hash32(title))
	for y := 0; y < flyerH; y++ {
		x0 := int(60 + float64(y)*0.4)
		for t := -36; t <= 36; t++ {
			x := x0 + t
			if x < 0 || x >= flyerW {
				continue
			}
			fall := 1 - math.Abs(float64(t))/36
			dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), inkWhite(), fall*0.14))
		}
	}
	drawTitleBlock(dst, title, 110, inkWhite(), color.RGBA{20, 12, 8, 255}, 68)
	drawMetaRow(dst, strings.ToUpper(genre)+"  /  "+strings.ToUpper(venue), 56, flyerH-96, inkWhite())
}

func paintSilhouette(dst *image.RGBA, th flyerTheme, title, venue, genre string) {
	fillVerticalGradient(dst, punch(th.mid, th.accent, 0.2), th.top, th.bottom)
	addRadialGlow(dst, flyerW/2, 300, 340, th.accent, 0.65)
	addRadialGlow(dst, flyerW/2, 300, 100, inkWhite(), 0.35)

	baseY := 760
	for x := 0; x < flyerW; x++ {
		h := 50 + int(40*math.Sin(float64(x)*0.045)) + int(28*math.Sin(float64(x)*0.11+1.1))
		for y := baseY - h; y < flyerH; y++ {
			dst.SetRGBA(x, y, color.RGBA{4, 4, 8, 255})
		}
	}
	for y := 160; y < baseY; y++ {
		half := int(28 + float64(y-160)*0.32)
		for x := flyerW/2 - half; x <= flyerW/2+half; x++ {
			a := 0.06 + 0.18*(1-float64(y-160)/float64(baseY-160))
			dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), th.accent, a))
		}
	}
	addFilmGrain(dst, 7, hash32(title+genre))
	drawCenteredLines(dst, splitTitle(title), flyerW/2, 120, inkWhite(), 66)
	drawMetaRow(dst, strings.ToUpper(venue), 56, flyerH-72, inkMuted())
}

// punch lifts a mid color toward the accent so dark cards stay readable.
func punch(base, accent color.RGBA, t float64) color.RGBA {
	return lerpRGBA(base, accent, clamp01(t))
}

// —— drawing helpers ——

func fillSolid(dst *image.RGBA, c color.RGBA) {
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: c}, image.Point{}, draw.Src)
}

func fillVerticalGradient(dst *image.RGBA, top, mid, bottom color.RGBA) {
	h := dst.Bounds().Dy()
	w := dst.Bounds().Dx()
	for y := 0; y < h; y++ {
		t := float64(y) / float64(h-1)
		var c color.RGBA
		if t < 0.45 {
			c = lerpRGBA(top, mid, t/0.45)
		} else {
			c = lerpRGBA(mid, bottom, (t-0.45)/0.55)
		}
		for x := 0; x < w; x++ {
			dst.SetRGBA(x, y, c)
		}
	}
}

func addRadialGlow(dst *image.RGBA, cx, cy int, radius float64, col color.RGBA, strength float64) {
	h := dst.Bounds().Dy()
	w := dst.Bounds().Dx()
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dx := float64(x - cx)
			dy := float64(y - cy)
			d := math.Sqrt(dx*dx+dy*dy) / radius
			if d >= 1 {
				continue
			}
			a := (1 - d) * (1 - d) * strength
			dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), col, a))
		}
	}
}

func addFilmGrain(dst *image.RGBA, amount int, seed uint32) {
	if amount <= 0 {
		return
	}
	h := dst.Bounds().Dy()
	w := dst.Bounds().Dx()
	for y := 0; y < h; y += 2 {
		for x := 0; x < w; x += 2 {
			n := int(noise2(x/2, y/2, seed)*float64(amount*2)) - amount
			for dy := 0; dy < 2 && y+dy < h; dy++ {
				for dx := 0; dx < 2 && x+dx < w; dx++ {
					c := dst.RGBAAt(x+dx, y+dy)
					dst.SetRGBA(x+dx, y+dy, color.RGBA{
						R: clampByte(int(c.R) + n),
						G: clampByte(int(c.G) + n),
						B: clampByte(int(c.B) + n),
						A: 255,
					})
				}
			}
		}
	}
}

func drawTriangle(dst *image.RGBA, x0, y0, x1, y1, x2, y2 float64, col color.RGBA, alpha float64) {
	minX := int(math.Min(x0, math.Min(x1, x2)))
	maxX := int(math.Max(x0, math.Max(x1, x2)))
	minY := int(math.Min(y0, math.Min(y1, y2)))
	maxY := int(math.Max(y0, math.Max(y1, y2)))
	for y := minY; y <= maxY; y++ {
		for x := minX; x <= maxX; x++ {
			if x < 0 || y < 0 || x >= flyerW || y >= flyerH {
				continue
			}
			if pointInTriangle(float64(x), float64(y), x0, y0, x1, y1, x2, y2) {
				dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), col, alpha))
			}
		}
	}
}

func pointInTriangle(px, py, x0, y0, x1, y1, x2, y2 float64) bool {
	d1 := sign(px, py, x0, y0, x1, y1)
	d2 := sign(px, py, x1, y1, x2, y2)
	d3 := sign(px, py, x2, y2, x0, y0)
	hasNeg := (d1 < 0) || (d2 < 0) || (d3 < 0)
	hasPos := (d1 > 0) || (d2 > 0) || (d3 > 0)
	return !(hasNeg && hasPos)
}

func sign(px, py, x0, y0, x1, y1 float64) float64 {
	return (px-x1)*(y0-y1) - (x0-x1)*(py-y1)
}

func drawCornerMark(dst *image.RGBA, col color.RGBA) {
	draw.Draw(dst, image.Rect(flyerW-100, flyerH-100, flyerW-48, flyerH-48), &image.Uniform{C: col}, image.Point{}, draw.Src)
}

func drawTitleBlock(dst *image.RGBA, title string, topY int, fg, accent color.RGBA, size float64) {
	lines := splitTitle(title)
	face := boldFace(size)
	defer face.Close()
	y := topY
	for i, line := range lines {
		col := fg
		if i == len(lines)-1 && len(lines) > 1 {
			col = accent
		}
		drawString(dst, face, line, 56, y, col)
		y += int(size * 1.15)
	}
}

func drawCenteredLines(dst *image.RGBA, lines []string, cx, topY int, fg color.RGBA, size float64) {
	face := boldFace(size)
	defer face.Close()
	y := topY
	for _, line := range lines {
		w := textWidth(face, line)
		drawString(dst, face, line, cx-w/2, y, fg)
		y += int(size * 1.2)
	}
}

func drawMetaRow(dst *image.RGBA, text string, x, y int, col color.RGBA) {
	face := regularFace(22)
	defer face.Close()
	drawString(dst, face, text, x, y, col)
}

func drawSmallLabel(dst *image.RGBA, text string, x, y int, col color.RGBA) {
	face := regularFace(18)
	defer face.Close()
	drawString(dst, face, strings.ToUpper(text), x, y, col)
}

func splitTitle(title string) []string {
	title = strings.TrimSpace(title)
	words := strings.Fields(title)
	if len(words) <= 2 {
		return []string{strings.ToUpper(title)}
	}
	if i := strings.Index(title, ":"); i > 0 {
		return []string{
			strings.ToUpper(strings.TrimSpace(title[:i])),
			strings.ToUpper(strings.TrimSpace(title[i+1:])),
		}
	}
	mid := len(words) / 2
	if mid < 1 {
		mid = 1
	}
	return []string{
		strings.ToUpper(strings.Join(words[:mid], " ")),
		strings.ToUpper(strings.Join(words[mid:], " ")),
	}
}

var (
	boldTTF    *opentype.Font
	regularTTF *opentype.Font
)

func init() {
	var err error
	boldTTF, err = opentype.Parse(gobold.TTF)
	if err != nil {
		panic("demoseed: parse gobold: " + err.Error())
	}
	regularTTF, err = opentype.Parse(goregular.TTF)
	if err != nil {
		panic("demoseed: parse goregular: " + err.Error())
	}
}

type faceCloser interface {
	font.Face
	Close() error
}

type otFace struct {
	font.Face
}

func (f otFace) Close() error { return nil }

func boldFace(size float64) faceCloser {
	f, err := opentype.NewFace(boldTTF, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingFull})
	if err != nil {
		panic(err)
	}
	return otFace{Face: f}
}

func regularFace(size float64) faceCloser {
	f, err := opentype.NewFace(regularTTF, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingFull})
	if err != nil {
		panic(err)
	}
	return otFace{Face: f}
}

func drawString(dst *image.RGBA, face font.Face, s string, x, y int, col color.RGBA) {
	d := &font.Drawer{
		Dst:  dst,
		Src:  image.NewUniform(col),
		Face: face,
		Dot:  fixed.P(x, y),
	}
	d.DrawString(s)
}

func textWidth(face font.Face, s string) int {
	return font.MeasureString(face, s).Ceil()
}

func setSoft(dst *image.RGBA, x, y int, col color.RGBA, a float64) {
	if x < 0 || y < 0 || x >= flyerW || y >= flyerH {
		return
	}
	dst.SetRGBA(x, y, blendRGBA(dst.RGBAAt(x, y), col, a))
}

func lerpRGBA(a, b color.RGBA, t float64) color.RGBA {
	t = clamp01(t)
	return color.RGBA{
		R: uint8(float64(a.R) + (float64(b.R)-float64(a.R))*t),
		G: uint8(float64(a.G) + (float64(b.G)-float64(a.G))*t),
		B: uint8(float64(a.B) + (float64(b.B)-float64(a.B))*t),
		A: 255,
	}
}

func blendRGBA(base, overlay color.RGBA, a float64) color.RGBA {
	if a <= 0 {
		return base
	}
	if a >= 1 {
		return overlay
	}
	return color.RGBA{
		R: uint8(float64(base.R)*(1-a) + float64(overlay.R)*a),
		G: uint8(float64(base.G)*(1-a) + float64(overlay.G)*a),
		B: uint8(float64(base.B)*(1-a) + float64(overlay.B)*a),
		A: 255,
	}
}

func inkWhite() color.RGBA { return color.RGBA{250, 250, 250, 255} }
func inkMuted() color.RGBA { return color.RGBA{210, 215, 225, 255} }

func clamp01(t float64) float64 {
	if t < 0 {
		return 0
	}
	if t > 1 {
		return 1
	}
	return t
}

func clampByte(v int) uint8 {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return uint8(v)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func hash32(s string) uint32 {
	var h uint32 = 2166136261
	for _, r := range s {
		if !unicode.IsPrint(r) {
			continue
		}
		h ^= uint32(r)
		h *= 16777619
	}
	return h
}

func noise2(x, y int, seed uint32) float64 {
	n := seed
	n ^= uint32(x) * 374761393
	n ^= uint32(y) * 668265263
	n = (n ^ (n >> 13)) * 1274126177
	return float64(n&0xffff) / 65535.0
}
