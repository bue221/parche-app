package demoseed

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestFlyerPNG_writesSamples(t *testing.T) {
	themes := []struct {
		name  string
		style flyerStyle
		theme flyerTheme
	}{
		{"neon_orb", styleNeonOrb, flyerTheme{
			top: color.RGBA{4, 8, 18, 255}, mid: color.RGBA{12, 40, 72, 255},
			bottom: color.RGBA{2, 2, 8, 255}, accent: color.RGBA{61, 220, 255, 255},
		}},
		{"minimal", styleMinimal, flyerTheme{
			top: color.RGBA{8, 16, 28, 255}, mid: color.RGBA{40, 72, 110, 255},
			bottom: color.RGBA{4, 8, 16, 255}, accent: color.RGBA{180, 230, 255, 255},
		}},
		{"grain", styleGrain, flyerTheme{
			top: color.RGBA{4, 20, 12, 255}, mid: color.RGBA{20, 80, 48, 255},
			bottom: color.RGBA{2, 8, 4, 255}, accent: color.RGBA{100, 255, 180, 255},
		}},
		{"shards", styleShards, flyerTheme{
			top: color.RGBA{24, 12, 4, 255}, mid: color.RGBA{96, 48, 8, 255},
			bottom: color.RGBA{8, 4, 2, 255}, accent: color.RGBA{255, 196, 77, 255},
		}},
		{"wire", styleWire, flyerTheme{
			top: color.RGBA{4, 8, 18, 255}, mid: color.RGBA{12, 40, 72, 255},
			bottom: color.RGBA{2, 2, 8, 255}, accent: color.RGBA{61, 220, 255, 255},
		}},
		{"bands", styleBands, flyerTheme{
			top: color.RGBA{40, 12, 28, 255}, mid: color.RGBA{180, 60, 40, 255},
			bottom: color.RGBA{12, 4, 20, 255}, accent: color.RGBA{255, 160, 80, 255},
		}},
		{"silhouette", styleSilhouette, flyerTheme{
			top: color.RGBA{12, 4, 28, 255}, mid: color.RGBA{56, 20, 96, 255},
			bottom: color.RGBA{4, 2, 12, 255}, accent: color.RGBA{196, 120, 255, 255},
		}},
	}

	dir := t.TempDir()
	for _, tc := range themes {
		png := flyerPNG(flyerMeta{
			title: "Selva 04",
			venue: "Bodega 9",
			genre: "techno",
			theme: tc.theme,
			style: tc.style,
		})
		if len(png) < 1000 {
			t.Fatalf("%s: png too small (%d bytes)", tc.name, len(png))
		}
		path := filepath.Join(dir, tc.name+".png")
		if err := os.WriteFile(path, png, 0o644); err != nil {
			t.Fatal(err)
		}
		t.Logf("wrote %s (%d bytes)", path, len(png))
	}

	// Also dump next to the package when PARCHE_FLYER_SAMPLES=1 for visual QA.
	if os.Getenv("PARCHE_FLYER_SAMPLES") == "1" {
		out := filepath.Join("testdata", "flyers")
		if err := os.MkdirAll(out, 0o755); err != nil {
			t.Fatal(err)
		}
		for _, tc := range themes {
			png := flyerPNG(flyerMeta{
				title: "Pulse 27",
				venue: "Chapinero",
				genre: "club",
				theme: tc.theme,
				style: tc.style,
			})
			if err := os.WriteFile(filepath.Join(out, tc.name+".png"), png, 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
}
