package demoseed

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"log/slog"
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

// Run is idempotent: if the promoter demo account exists, it returns.
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

	existing, err := d.Events.ListTenant(ctx, promoterID, tenantID, events.ListFilter{Limit: 50})
	if err != nil {
		return err
	}
	for _, ev := range existing {
		if ev.Title == "Selva 04" {
			log.Info("demo seed already present")
			return nil
		}
	}

	var lunaArtist artists.Artist
	if d.Artists != nil {
		lunaArtist, err = d.Artists.Store.ByUserID(ctx, ids["luna@parche.test"])
		if errors.Is(err, auth.ErrNotFound) {
			lunaArtist, err = d.Artists.Create(ctx, ids["luna@parche.test"], artists.CreateInput{
				Name: "Luna Vox", Bio: "Techno de Bogotá. Graves largos, sin relleno.",
			})
		}
		if err != nil {
			return err
		}
		if _, err := d.Artists.Create(ctx, promoterID, artists.CreateInput{
			Name: "Motor Sur", Bio: "Warehouse DJ.", TenantID: tenantID,
		}); err != nil && !errors.Is(err, auth.ErrConflict) {
			return err
		}
	}

	now := time.Now().UTC()
	selva, err := d.Events.Create(ctx, promoterID, events.CreateInput{
		TenantID:    tenantID,
		Title:       "Selva 04",
		Description: "Bosque de pinos, sistema de tres vías, hasta el amanecer.",
		StartsAt:    now.Add(36 * time.Hour),
		EndsAt:      now.Add(44 * time.Hour),
		Pin:         &events.PinInput{Name: "Selva Norte", AddressText: "Usaquén, Bogotá", Lat: 4.705, Lng: -74.031},
		Genres:      []string{"techno"},
	})
	if err != nil {
		return err
	}
	bodega, err := d.Events.Create(ctx, promoterID, events.CreateInput{
		TenantID:    tenantID,
		Title:       "Bodega Cerrada",
		Description: "Cuatro paredes, cero celular, todo el cuerpo.",
		StartsAt:    now.Add(7 * 24 * time.Hour),
		EndsAt:      now.Add(7*24*time.Hour + 6*time.Hour),
		Pin:         &events.PinInput{Name: "Puente Aranda", AddressText: "Puente Aranda, Bogotá", Lat: 4.627, Lng: -74.117},
		Genres:      []string{"industrial"},
	})
	if err != nil {
		return err
	}
	if _, err := d.Events.Create(ctx, promoterID, events.CreateInput{
		TenantID:    tenantID,
		Title:       "Ensayo privado",
		Description: "Borrador. No sale en agenda.",
		StartsAt:    now.Add(14 * 24 * time.Hour),
		EndsAt:      now.Add(14*24*time.Hour + 3*time.Hour),
		Pin:         &events.PinInput{Name: "Estudio", AddressText: "Teusaquillo, Bogotá", Lat: 4.641, Lng: -74.078},
		Genres:      []string{"techno"},
	}); err != nil {
		return err
	}

	if err := attachFlyer(ctx, d, promoterID, selva, flyerPNG("SELVA 04", color.RGBA{20, 20, 20, 255})); err != nil {
		return err
	}
	if err := attachFlyer(ctx, d, promoterID, bodega, flyerPNG("BODEGA", color.RGBA{8, 8, 8, 255})); err != nil {
		return err
	}

	for _, ev := range []events.Event{selva, bodega} {
		if err := d.Events.Submit(ctx, promoterID, ev.ID); err != nil {
			return err
		}
		if _, err := d.Events.Publish(ctx, ev.ID); err != nil {
			return err
		}
	}

	if _, err := d.Events.PutTicketTypes(ctx, promoterID, selva.ID, []events.TicketTypeInput{
		{Name: "Early", PriceCents: 60000, Capacity: 80, Status: events.TicketOnSale},
		{Name: "Door", PriceCents: 90000, Capacity: 40, Status: events.TicketOnSale},
	}); err != nil {
		return err
	}
	if _, err := d.Events.PutTicketTypes(ctx, promoterID, bodega.ID, []events.TicketTypeInput{
		{Name: "GA", PriceCents: 50000, Capacity: 120, Status: events.TicketOnSale},
	}); err != nil {
		return err
	}

	for _, row := range []events.Member{
		{EventID: selva.ID, UserID: ids["door@parche.test"], Role: events.RoleDoor, Status: events.MemberActive},
		{EventID: selva.ID, UserID: ids["metrics@parche.test"], Role: events.RoleMetrics, Status: events.MemberActive},
		{EventID: bodega.ID, UserID: ids["door@parche.test"], Role: events.RoleDoor, Status: events.MemberActive},
	} {
		if err := d.Events.Store.UpsertMember(ctx, row); err != nil {
			return err
		}
	}

	if d.Artists != nil && lunaArtist.ID != "" {
		_ = d.Artists.AddLineup(ctx, selva.ID, artists.LineupInput{ArtistID: lunaArtist.ID, BillingOrder: 0})
	}

	log.Info("demo seed ready", "password", Password, "events", "Selva 04, Bodega Cerrada")
	return nil
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

func flyerPNG(label string, bg color.RGBA) []byte {
	const w, h = 800, 1000
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: bg}, image.Point{}, draw.Src)
	ink := color.RGBA{245, 245, 245, 255}
	// Horizontal bars as a gig-flyer rhythm (no font dependency).
	for i, y := range []int{80, 200, 720, 880} {
		thickness := 24
		if i == 0 {
			thickness = 48
		}
		draw.Draw(dst, image.Rect(64, y, w-64, y+thickness), &image.Uniform{C: ink}, image.Point{}, draw.Src)
	}
	// Encode label length as block groups so files differ per event.
	n := len(strings.TrimSpace(label))
	if n < 1 {
		n = 1
	}
	for i := 0; i < n && i < 12; i++ {
		x := 80 + i*56
		draw.Draw(dst, image.Rect(x, 420, x+40, 560), &image.Uniform{C: ink}, image.Point{}, draw.Src)
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, dst)
	return buf.Bytes()
}
