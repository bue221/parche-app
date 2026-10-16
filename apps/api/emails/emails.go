package emails

import "embed"

// FS holds versioned transactional templates (F26). Do not put secrets here.
//
//go:embed *.md
var FS embed.FS
