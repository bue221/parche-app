package demoseed

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"image"
	"image/color"
	"image/png"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/media"
	"github.com/parche-app/backend/internal/objectstore"
	"golang.org/x/image/draw"
)

const (
	Password = "parche1234"
	marker   = "promoter@parche.test"
)

// Deps is the live API graph. Nil services are skipped.
type Deps struct {
	Auth    *auth.Service
	Events  *events.Service
	Artists *artists.Service
	Media   *media.Service
	Objects objectstore.Store
	Log     *slog.Logger
}

type publicBucket interface {
	AllowPublicGet(ctx context.Context) error
}

type flyerTheme struct {
	top, mid, bottom, accent color.RGBA
}

type demoSpec struct {
	title       string
	description string
	startsAt    time.Time
	endsAt      time.Time
	pin         events.PinInput
	genres      []string
	agePolicy   string
	publish     bool
	tickets     []events.TicketTypeInput
	theme       flyerTheme
	doorStaff   bool
	metricsStaff bool
	lineupLuna  bool
	withTracks  bool
}

// Run is idempotent: creates missing demo accounts/events and refreshes flyers.
func Run(ctx context.Context, d Deps) error {
	if d.Auth == nil || d.Events == nil {
		return nil
	}
	log := d.Log
	if log == nil {
		log = slog.Default()
	}

	if pb, ok := d.Objects.(publicBucket); ok {
		if err := pb.AllowPublicGet(ctx); err != nil {
			log.Error("demo minio public policy", "err", err)
		}
	}

	type account struct {
		email, name, profile string
	}
	accounts := []account{
		{"ata@parche.test", "Ata Rivas", "attendee"},
		{marker, "Nora Promoter", "promoter"},
		{"door@parche.test", "Diego Puerta", "attendee"},
		{"metrics@parche.test", "Meli Cifras", "attendee"},
		{"admin@parche.test", "Admin Parche", "attendee"},
		{"luna@parche.test", "Luna Vox", "attendee"},
	}
	ids := map[string]string{}
	for _, a := range accounts {
		u, err := d.Auth.Store.UserByEmail(ctx, a.email)
		if errors.Is(err, auth.ErrNotFound) {
			sess, err := d.Auth.Register(ctx, auth.RegisterInput{
				Email: a.email, Password: Password, DisplayName: a.name, Profile: a.profile, UserAgent: "demoseed",
			})
			if err != nil {
				return err
			}
			ids[a.email] = sess.User.ID
			continue
		}
		if err != nil {
			return err
		}
		ids[a.email] = u.ID
	}
	if err := d.Auth.BootstrapPlatformAdmin(ctx, "admin@parche.test"); err != nil {
		return err
	}
	if err := d.Auth.AddArtistProfile(ctx, ids["luna@parche.test"]); err != nil {
		return err
	}

	me, err := d.Auth.Me(ctx, ids[marker])
	if err != nil || len(me.Tenants) == 0 {
		return err
	}
	tenantID := me.Tenants[0].ID
	promoterID := ids[marker]

	var lunaArtist artists.Artist
	if d.Artists != nil {
		lunaArtist, err = d.Artists.Store.ByUserID(ctx, ids["luna@parche.test"])
		if errors.Is(err, auth.ErrNotFound) {
			lunaArtist, err = d.Artists.Create(ctx, ids["luna@parche.test"], artists.CreateInput{
				Name: "Luna Vox", Bio: "Voces rotas sobre 138. Bogotá / Berlín.",
			})
		}
		if err != nil {
			return err
		}
		for _, in := range []artists.CreateInput{
			{Name: "Motor Sur", Bio: "Hardware live, cero laptop hero.", TenantID: tenantID},
			{Name: "Nexus 9", Bio: "Peak-time techno. Kick primero, ego después.", TenantID: tenantID},
			{Name: "Bruma", Bio: "Pads largos, lluvia corta. Ambient / downtempo.", TenantID: tenantID},
			{Name: "KILO", Bio: "Industrial duro, luces rojas, silencio entre drops.", TenantID: tenantID},
			{Name: "Onda Río", Bio: "House profundo desde Chapinero hasta el sol.", TenantID: tenantID},
		} {
			if _, err := d.Artists.Create(ctx, promoterID, in); err != nil && !errors.Is(err, auth.ErrConflict) {
				return err
			}
		}
	}

	existing, err := d.Events.ListTenant(ctx, promoterID, tenantID, events.ListFilter{Limit: 100})
	if err != nil {
		return err
	}
	byTitle := make(map[string]events.Event, len(existing))
	for _, ev := range existing {
		byTitle[ev.Title] = ev
	}

	now := time.Now().UTC()
	catalog := demoCatalog(now)
	missing := 0
	for _, spec := range catalog {
		if _, ok := byTitle[spec.title]; !ok {
			missing++
		}
	}
	// When the catalog grows (e.g. 2027 wave), refresh flyers on existing demos too.
	refreshExistingFlyers := missing > 0

	created := 0
	refreshed := 0

	for _, spec := range catalog {
		ev, ok := byTitle[spec.title]
		if !ok {
			ev, err = d.Events.Create(ctx, promoterID, events.CreateInput{
				TenantID:    tenantID,
				Title:       spec.title,
				Description: spec.description,
				StartsAt:    spec.startsAt,
				EndsAt:      spec.endsAt,
				Pin:         &spec.pin,
				Genres:      spec.genres,
				AgePolicy:   spec.agePolicy,
			})
			if err != nil {
				return err
			}
			created++

			if err := attachFlyer(ctx, d, promoterID, ev, flyerPNG(spec.title, spec.theme)); err != nil {
				if spec.publish {
					return err
				}
				log.Error("demo seed draft flyer", "title", spec.title, "err", err)
			} else {
				refreshed++
			}

			if spec.publish {
				if err := d.Events.Submit(ctx, promoterID, ev.ID); err != nil {
					return err
				}
				if _, err := d.Events.Publish(ctx, ev.ID); err != nil {
					return err
				}
				if len(spec.tickets) > 0 {
					if _, err := d.Events.PutTicketTypes(ctx, promoterID, ev.ID, spec.tickets); err != nil {
						return err
					}
				}
			}

			if spec.doorStaff {
				_ = d.Events.Store.UpsertMember(ctx, events.Member{
					EventID: ev.ID, UserID: ids["door@parche.test"], Role: events.RoleDoor, Status: events.MemberActive,
				})
			}
			if spec.metricsStaff {
				_ = d.Events.Store.UpsertMember(ctx, events.Member{
					EventID: ev.ID, UserID: ids["metrics@parche.test"], Role: events.RoleMetrics, Status: events.MemberActive,
				})
			}
			if spec.lineupLuna && d.Artists != nil && lunaArtist.ID != "" {
				_ = d.Artists.AddLineup(ctx, ev.ID, artists.LineupInput{ArtistID: lunaArtist.ID, BillingOrder: 0})
			}
			if spec.withTracks {
				if err := ensureSelvaTracks(ctx, d, promoterID, ev); err != nil {
					log.Error("demo seed tracks", "err", err)
				}
			}
			continue
		}

		if refreshExistingFlyers || strings.TrimSpace(ev.FlyerAssetID) == "" {
			if err := attachFlyer(ctx, d, promoterID, ev, flyerPNG(spec.title, spec.theme)); err != nil {
				log.Error("demo seed flyer refresh", "title", spec.title, "err", err)
			} else {
				refreshed++
			}
		}
		if spec.withTracks {
			if err := ensureSelvaTracks(ctx, d, promoterID, ev); err != nil {
				log.Error("demo seed tracks", "err", err)
			}
		}
	}

	log.Info("demo seed ready",
		"password", Password,
		"created", created,
		"flyers", refreshed,
		"events", len(catalog),
	)
	return nil
}

func demoCatalog(now time.Time) []demoSpec {
	neon := flyerTheme{
		top: color.RGBA{4, 8, 18, 255}, mid: color.RGBA{12, 40, 72, 255},
		bottom: color.RGBA{2, 2, 8, 255}, accent: color.RGBA{61, 220, 255, 255},
	}
	volt := flyerTheme{
		top: color.RGBA{4, 16, 12, 255}, mid: color.RGBA{18, 64, 48, 255},
		bottom: color.RGBA{2, 8, 6, 255}, accent: color.RGBA{127, 254, 177, 255},
	}
	amber := flyerTheme{
		top: color.RGBA{24, 12, 4, 255}, mid: color.RGBA{96, 48, 8, 255},
		bottom: color.RGBA{8, 4, 2, 255}, accent: color.RGBA{255, 196, 77, 255},
	}
	danger := flyerTheme{
		top: color.RGBA{24, 4, 8, 255}, mid: color.RGBA{96, 16, 24, 255},
		bottom: color.RGBA{8, 2, 4, 255}, accent: color.RGBA{255, 77, 61, 255},
	}
	violet := flyerTheme{
		top: color.RGBA{12, 4, 28, 255}, mid: color.RGBA{56, 20, 96, 255},
		bottom: color.RGBA{4, 2, 12, 255}, accent: color.RGBA{196, 120, 255, 255},
	}
	ice := flyerTheme{
		top: color.RGBA{8, 16, 28, 255}, mid: color.RGBA{40, 72, 110, 255},
		bottom: color.RGBA{4, 8, 16, 255}, accent: color.RGBA{180, 230, 255, 255},
	}
	sunset := flyerTheme{
		top: color.RGBA{40, 12, 28, 255}, mid: color.RGBA{180, 60, 40, 255},
		bottom: color.RGBA{12, 4, 20, 255}, accent: color.RGBA{255, 160, 80, 255},
	}
	forest := flyerTheme{
		top: color.RGBA{4, 20, 12, 255}, mid: color.RGBA{20, 80, 48, 255},
		bottom: color.RGBA{2, 8, 4, 255}, accent: color.RGBA{100, 255, 180, 255},
	}

	return []demoSpec{
		{
			title: "Selva 04", description: "Cuatro salas, un patio, cero sponsors de bebida energética.",
			startsAt: now.Add(36 * time.Hour), endsAt: now.Add(44 * time.Hour),
			pin: events.PinInput{Name: "Bodega 9", AddressText: "Cra 24 # 39, Teusaquillo", Lat: 4.6412, Lng: -74.0789},
			genres: []string{"techno"}, agePolicy: "18+", publish: true, theme: forest,
			tickets: []events.TicketTypeInput{
				{Name: "Early", PriceCents: 60000, Capacity: 80, Status: events.TicketOnSale},
				{Name: "Door", PriceCents: 90000, Capacity: 40, Status: events.TicketOnSale},
			},
			doorStaff: true, metricsStaff: true, lineupLuna: true, withTracks: true,
		},
		{
			title: "Bodega Cerrada", description: "Cierre de temporada. Lineup corto, sistema largo.",
			startsAt: now.Add(7 * 24 * time.Hour), endsAt: now.Add(7*24*time.Hour + 6*time.Hour),
			pin: events.PinInput{Name: "Calle 26 warehouse", AddressText: "Av El Dorado, Bogotá", Lat: 4.6651, Lng: -74.1094},
			genres: []string{"house"}, agePolicy: "18+", publish: true, theme: amber,
			tickets: []events.TicketTypeInput{
				{Name: "GA", PriceCents: 50000, Capacity: 120, Status: events.TicketOnSale},
			},
			doorStaff: true,
		},
		{
			title: "Ensayo privado", description: "Borrador sin pin todavía — demo draft.",
			startsAt: now.Add(14 * 24 * time.Hour), endsAt: now.Add(14*24*time.Hour + 3*time.Hour),
			pin: events.PinInput{Name: "Estudio", AddressText: "Teusaquillo, Bogotá", Lat: 4.641, Lng: -74.078},
			genres: []string{"ambient"}, publish: false, theme: ice,
		},
		// —— Calendario 2027 ——
		{
			title: "Año Nuevo: Pulse 27", description: "Cuenta regresiva con kick. Fuegos afuera, lasers adentro.",
			startsAt: bogota(2027, 1, 1, 0), endsAt: bogota(2027, 1, 1, 8),
			pin: events.PinInput{Name: "Terraza Chapinero", AddressText: "Cra 7 # 67, Chapinero", Lat: 4.6533, Lng: -74.0586},
			genres: []string{"club"}, agePolicy: "18+", publish: true, theme: neon,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 150000, Capacity: 400, Status: events.TicketOnSale}},
		},
		{
			title: "Neon Garden", description: "Plantas, neón y deep house. San Valentín sin playlist comercial.",
			startsAt: bogota(2027, 2, 14, 21), endsAt: bogota(2027, 2, 15, 5),
			pin: events.PinInput{Name: "Invernadero Norte", AddressText: "Cll 100 # 19, Bogotá", Lat: 4.6832, Lng: -74.0481},
			genres: []string{"house"}, agePolicy: "18+", publish: true, theme: volt,
			tickets: []events.TicketTypeInput{{Name: "Early", PriceCents: 70000, Capacity: 180, Status: events.TicketOnSale}},
		},
		{
			title: "Bruma Room", description: "Equinoccio quieto. Ambient en vivo, zero phone flash.",
			startsAt: bogota(2027, 3, 20, 20), endsAt: bogota(2027, 3, 21, 1),
			pin: events.PinInput{Name: "Sala Oscura", AddressText: "Cra 15 # 85, Bogotá", Lat: 4.6681, Lng: -74.0572},
			genres: []string{"ambient"}, agePolicy: "16+", publish: true, theme: ice,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 45000, Capacity: 90, Status: events.TicketOnSale}},
		},
		{
			title: "Acid Roof", description: "303 al aire. Si llueve, subimos el volumen.",
			startsAt: bogota(2027, 4, 17, 22), endsAt: bogota(2027, 4, 18, 6),
			pin: events.PinInput{Name: "Azotea 45", AddressText: "Cll 45 # 22, Teusaquillo", Lat: 4.6358, Lng: -74.0721},
			genres: []string{"techno"}, agePolicy: "18+", publish: true, theme: neon,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 90000, Capacity: 220, Status: events.TicketOnSale}},
		},
		{
			title: "House Río", description: "Tarde al sol, sunset set de Onda Río. Picnic permitido.",
			startsAt: bogota(2027, 5, 29, 16), endsAt: bogota(2027, 5, 29, 22),
			pin: events.PinInput{Name: "Parque Simón Bolívar", AddressText: "Bogotá", Lat: 4.6585, Lng: -74.0931},
			genres: []string{"house"}, agePolicy: "all ages", publish: true, theme: sunset,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 35000, Capacity: 500, Status: events.TicketOnSale}},
		},
		{
			title: "Industrial Yard", description: "KILO + guests. Orejeras recomendadas, ego no.",
			startsAt: bogota(2027, 6, 19, 23), endsAt: bogota(2027, 6, 20, 7),
			pin: events.PinInput{Name: "Patio Metalúrgico", AddressText: "Zona Industrial Puente Aranda", Lat: 4.6289, Lng: -74.112},
			genres: []string{"industrial"}, agePolicy: "18+", publish: true, theme: danger,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 85000, Capacity: 250, Status: events.TicketOnSale}},
		},
		{
			title: "Club 26 After", description: "Afterhours hasta que el metro abra. Cash bar.",
			startsAt: bogota(2027, 7, 10, 2), endsAt: bogota(2027, 7, 10, 10),
			pin: events.PinInput{Name: "Sótano 26", AddressText: "Av El Dorado # 68, Bogotá", Lat: 4.6482, Lng: -74.1015},
			genres: []string{"club"}, agePolicy: "21+", publish: true, theme: violet,
			tickets: []events.TicketTypeInput{{Name: "After", PriceCents: 50000, Capacity: 120, Status: events.TicketOnSale}},
		},
		{
			title: "Luna Vox: En vivo", description: "Show sentado + encore de pie. Voces, no DJ set.",
			startsAt: bogota(2027, 8, 14, 20), endsAt: bogota(2027, 8, 14, 23),
			pin: events.PinInput{Name: "Teatro del Parque", AddressText: "Cll 63 # 10, Bogotá", Lat: 4.6491, Lng: -74.0628},
			genres: []string{"concierto"}, agePolicy: "all ages", publish: true, theme: violet,
			tickets: []events.TicketTypeInput{{Name: "Platea", PriceCents: 120000, Capacity: 300, Status: events.TicketOnSale}},
			lineupLuna: true,
		},
		{
			title: "Trance Mirador", description: "Uplifting hasta el atardecer. Trae chaqueta.",
			startsAt: bogota(2027, 9, 25, 18), endsAt: bogota(2027, 9, 25, 23),
			pin: events.PinInput{Name: "Mirador Monserrate base", AddressText: "Cra 2 Este, Bogotá", Lat: 4.6056, Lng: -74.0565},
			genres: []string{"trance"}, agePolicy: "18+", publish: true, theme: sunset,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 65000, Capacity: 350, Status: events.TicketOnSale}},
		},
		{
			title: "Motor Sur All-nighter", description: "Halloween hardware: sin laptop, con máscara.",
			startsAt: bogota(2027, 10, 30, 22), endsAt: bogota(2027, 10, 31, 8),
			pin: events.PinInput{Name: "Bodega Halloween", AddressText: "Cll 26 warehouse B, Bogotá", Lat: 4.6668, Lng: -74.108},
			genres: []string{"techno"}, agePolicy: "18+", publish: true, theme: danger,
			tickets: []events.TicketTypeInput{{Name: "GA", PriceCents: 100000, Capacity: 280, Status: events.TicketOnSale}},
		},
		{
			title: "Selva 05", description: "Cierre de año Selva. Cinco salas, un patio, lineup TBA.",
			startsAt: bogota(2027, 12, 11, 21), endsAt: bogota(2027, 12, 12, 8),
			pin: events.PinInput{Name: "Bodega 9", AddressText: "Cra 24 # 39, Teusaquillo", Lat: 4.6412, Lng: -74.0789},
			genres: []string{"techno"}, agePolicy: "18+", publish: true, theme: forest,
			tickets: []events.TicketTypeInput{
				{Name: "Early", PriceCents: 90000, Capacity: 250, Status: events.TicketOnSale},
				{Name: "Door", PriceCents: 120000, Capacity: 100, Status: events.TicketOnSale},
			},
			lineupLuna: true,
		},
	}
}

func bogota(year int, month time.Month, day, hour int) time.Time {
	loc := time.FixedZone("COT", -5*3600)
	return time.Date(year, month, day, hour, 0, 0, 0, loc).UTC()
}

func attachFlyer(ctx context.Context, d Deps, userID string, ev events.Event, png []byte) error {
	if d.Media == nil || d.Objects == nil {
		return errors.New("media/object store required for demo flyers")
	}
	key, err := objectstore.BuildKey(objectstore.KindFlyer, ev.TenantID, ev.ID, "", "image/png")
	if err != nil {
		return err
	}
	if err := d.Media.SaveIntent(ctx, media.Intent{
		Key: key, UserID: userID, Kind: media.KindFlyer, EventID: ev.ID,
		ContentType: "image/png", ByteSize: int64(len(png)), ExpiresAt: time.Now().UTC().Add(time.Hour),
	}); err != nil {
		return err
	}
	if err := d.Objects.Put(ctx, key, "image/png", bytes.NewReader(png), int64(len(png))); err != nil {
		return err
	}
	img, err := d.Media.Confirm(ctx, media.ConfirmInput{
		UserID: userID, TenantID: ev.TenantID, EventID: ev.ID, Key: key, Kind: media.KindFlyer,
	})
	if err != nil {
		return err
	}
	_ = d.Media.Process(ctx, img.ID)
	return nil
}

// flyerPNG builds a portrait gig flyer: vertical gradient, neon bars, soft glow, label blocks.
func flyerPNG(label string, th flyerTheme) []byte {
	const w, h = 800, 1000
	dst := image.NewRGBA(image.Rect(0, 0, w, h))

	for y := 0; y < h; y++ {
		t := float64(y) / float64(h-1)
		var c color.RGBA
		if t < 0.45 {
			u := t / 0.45
			c = lerpRGBA(th.top, th.mid, u)
		} else {
			u := (t - 0.45) / 0.55
			c = lerpRGBA(th.mid, th.bottom, u)
		}
		for x := 0; x < w; x++ {
			dst.SetRGBA(x, y, c)
		}
	}

	// Soft radial glow behind the mid band.
	cx, cy, radius := w/2, 380, 320.0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dx := float64(x - cx)
			dy := float64(y - cy)
			d := math.Sqrt(dx*dx+dy*dy) / radius
			if d >= 1 {
				continue
			}
			a := (1 - d) * (1 - d) * 0.55
			base := dst.RGBAAt(x, y)
			dst.SetRGBA(x, y, blendRGBA(base, th.accent, a))
		}
	}

	// Diagonal light streak.
	for y := 0; y < h; y++ {
		x0 := int(120 + float64(y)*0.35)
		for t := -18; t <= 18; t++ {
			x := x0 + t
			if x < 0 || x >= w {
				continue
			}
			fall := 1 - math.Abs(float64(t))/18
			base := dst.RGBAAt(x, y)
			dst.SetRGBA(x, y, blendRGBA(base, color.RGBA{255, 255, 255, 255}, fall*0.12))
		}
	}

	ink := color.RGBA{245, 245, 245, 255}
	bars := []struct {
		y, thickness int
		col          color.RGBA
	}{
		{72, 52, th.accent},
		{180, 18, ink},
		{720, 18, ink},
		{860, 36, th.accent},
	}
	for _, b := range bars {
		draw.Draw(dst, image.Rect(56, b.y, w-56, b.y+b.thickness), &image.Uniform{C: b.col}, image.Point{}, draw.Src)
	}

	// Encode label as block groups so files differ per event.
	n := len(strings.TrimSpace(label))
	if n < 1 {
		n = 1
	}
	for i := 0; i < n && i < 14; i++ {
		x := 72 + i*48
		col := ink
		if i%3 == 0 {
			col = th.accent
		}
		draw.Draw(dst, image.Rect(x, 400, x+32, 560), &image.Uniform{C: col}, image.Point{}, draw.Src)
	}

	// Bottom corner mark.
	draw.Draw(dst, image.Rect(w-120, h-120, w-56, h-56), &image.Uniform{C: th.accent}, image.Point{}, draw.Src)

	var buf bytes.Buffer
	_ = png.Encode(&buf, dst)
	return buf.Bytes()
}

func lerpRGBA(a, b color.RGBA, t float64) color.RGBA {
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
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

func ensureSelvaTracks(ctx context.Context, d Deps, userID string, ev events.Event) error {
	if d.Media == nil || d.Objects == nil || d.Events == nil {
		return nil
	}
	full, err := d.Events.Get(ctx, userID, ev.ID)
	if err != nil {
		return err
	}
	if len(full.Tracks) > 0 {
		return nil
	}
	wav := toneWAV()
	key, err := objectstore.BuildKey(objectstore.KindAudio, ev.TenantID, ev.ID, "", "audio/wav")
	if err != nil {
		return err
	}
	if err := d.Media.SaveIntent(ctx, media.Intent{
		Key: key, UserID: userID, Kind: media.KindAudio, EventID: ev.ID,
		ContentType: "audio/wav", ByteSize: int64(len(wav)), ExpiresAt: time.Now().UTC().Add(time.Hour),
	}); err != nil {
		return err
	}
	if err := d.Objects.Put(ctx, key, "audio/wav", bytes.NewReader(wav), int64(len(wav))); err != nil {
		return err
	}
	view, err := d.Media.ConfirmAudio(ctx, media.ConfirmInput{
		UserID: userID, TenantID: ev.TenantID, EventID: ev.ID, Key: key, Kind: media.KindAudio,
	})
	if err != nil {
		return err
	}
	if err := d.Media.Process(ctx, view.ID); err != nil {
		if d.Log != nil {
			d.Log.Error("demo seed audio transcode", "err", err)
		}
	}
	_, err = d.Media.ReplaceTracks(ctx, ev.ID, []media.TrackInput{
		{AssetID: view.ID, Title: "Selva 04 — reference", Position: 0},
	})
	return err
}

func toneWAV() []byte {
	const sampleRate = 44100
	const seconds = 2
	const freq = 220.0
	n := sampleRate * seconds
	dataBytes := n * 2
	buf := bytes.NewBuffer(make([]byte, 0, 44+dataBytes))
	_, _ = buf.WriteString("RIFF")
	_ = binary.Write(buf, binary.LittleEndian, uint32(36+dataBytes))
	_, _ = buf.WriteString("WAVEfmt ")
	_ = binary.Write(buf, binary.LittleEndian, uint32(16))
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(buf, binary.LittleEndian, uint32(sampleRate))
	_ = binary.Write(buf, binary.LittleEndian, uint32(sampleRate*2))
	_ = binary.Write(buf, binary.LittleEndian, uint16(2))
	_ = binary.Write(buf, binary.LittleEndian, uint16(16))
	_, _ = buf.WriteString("data")
	_ = binary.Write(buf, binary.LittleEndian, uint32(dataBytes))
	for i := 0; i < n; i++ {
		amp := 0.22
		if i < sampleRate/10 {
			amp *= float64(i) / float64(sampleRate/10)
		}
		tail := n - sampleRate/10
		if i > tail {
			amp *= float64(n-i) / float64(sampleRate/10)
		}
		sample := math.Sin(2 * math.Pi * freq * float64(i) / sampleRate)
		_ = binary.Write(buf, binary.LittleEndian, int16(sample*amp*32767))
	}
	return buf.Bytes()
}
