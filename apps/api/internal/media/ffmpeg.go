package media

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (s *Service) makePreview(ctx context.Context, src []byte) (PreviewResult, error) {
	if s.PreviewAudio != nil {
		return s.PreviewAudio(ctx, src)
	}
	return ffmpegPreview(ctx, src)
}

func ffmpegPreview(ctx context.Context, src []byte) (PreviewResult, error) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return PreviewResult{}, fmt.Errorf("ffmpeg not installed: %w", err)
	}
	dir, err := os.MkdirTemp("", "parche-audio-*")
	if err != nil {
		return PreviewResult{}, err
	}
	defer func() { _ = os.RemoveAll(dir) }()

	inPath := filepath.Join(dir, "src.bin")
	outPath := filepath.Join(dir, "preview.mp3")
	if err := os.WriteFile(inPath, src, 0o600); err != nil {
		return PreviewResult{}, err
	}

	args := []string{
		"-hide_banner", "-loglevel", "error", "-y",
		"-i", inPath,
		"-t", strconv.Itoa(previewSeconds),
		"-af", fmt.Sprintf("afade=t=out:st=%d:d=2", previewSeconds-2),
		"-c:a", "libmp3lame", "-b:a", "96k", "-ar", "44100", "-ac", "2",
		outPath,
	}
	cmd := exec.CommandContext(ctx, ffmpeg, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// Alpine/dev images sometimes ship ffmpeg without lame; AAC is the documented alternative.
		argsAAC := []string{
			"-hide_banner", "-loglevel", "error", "-y",
			"-i", inPath,
			"-t", strconv.Itoa(previewSeconds),
			"-af", fmt.Sprintf("afade=t=out:st=%d:d=2", previewSeconds-2),
			"-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-ac", "2",
			filepath.Join(dir, "preview.m4a"),
		}
		outPath = filepath.Join(dir, "preview.m4a")
		cmd = exec.CommandContext(ctx, ffmpeg, argsAAC...)
		stderr.Reset()
		cmd.Stderr = &stderr
		if err2 := cmd.Run(); err2 != nil {
			return PreviewResult{}, fmt.Errorf("ffmpeg: %w: %s", err2, strings.TrimSpace(stderr.String()))
		}
	}

	body, err := os.ReadFile(outPath)
	if err != nil {
		return PreviewResult{}, err
	}
	if int64(len(body)) > maxPreviewBytes {
		return PreviewResult{}, fmt.Errorf("preview exceeds %d bytes", maxPreviewBytes)
	}
	mime := previewMIME
	if strings.HasSuffix(outPath, ".m4a") {
		mime = "audio/mp4"
	}
	dur := probeDurationMS(ctx, outPath)
	if dur <= 0 {
		dur = previewSeconds * 1000
	}
	if dur > previewSeconds*1000 {
		dur = previewSeconds * 1000
	}
	return PreviewResult{Body: body, MIME: mime, DurationMS: dur}, nil
}

func probeDurationMS(ctx context.Context, path string) int {
	ffprobe, err := exec.LookPath("ffprobe")
	if err != nil {
		return 0
	}
	cmd := exec.CommandContext(ctx, ffprobe,
		"-v", "error", "-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1", path)
	out, err := cmd.Output()
	if err != nil {
		return 0
	}
	sec, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
	if err != nil || sec <= 0 {
		return 0
	}
	return int(time.Duration(sec * float64(time.Second)).Milliseconds())
}
