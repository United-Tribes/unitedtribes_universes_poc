/**
 * SoundtrackPlayer — Ported from SML SoundtrackModal.tsx
 *
 * FOR FILMS: Two sections (Original Score / Music From), each toggleable between Spotify & YouTube
 * FOR ALBUMS: Spotify and YouTube tabs only (no score/soundtrack distinction)
 *
 * Split layout: video player (70%) + track listing (30%)
 * Previous/Next navigation, heart/favorite per track (toggle on/off), edit/override playlists
 *
 * Props:
 *   isOpen, onClose, title, year, composer, artist,
 *   mode: "film" | "album" (default: auto-detect)
 *   scorePlaylistId, musicPlaylistId, spotifyAlbumId,
 *   library (Set), toggleLibrary (fn)
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { findPlaylist } from "../utils/enrichment.js";

export default function SoundtrackPlayer({
  isOpen,
  onClose,
  title,
  year,
  composer,
  artist,
  mode: modeProp,
  scorePlaylistId,
  musicPlaylistId,
  spotifyAlbumId,
  prebuiltTracks, // [{title, artist, videoId, thumbnail, duration}] — skip findPlaylist when provided
  prebuiltMusicFromTracks, // [{title, artist, videoId, thumbnail}] — needle drops for Music From tab, skip findPlaylist("music")
  library,
  toggleLibrary,
  universe,       // string slug — "bluenote" | "pluribus" | "sinners" | "gerwig" | "pattismith"
  initialFilmSection, // "score" | "music" — forces opening tab for round-trip from wall
  enrichedCatalogContent, // full catalog array for Featured Discovery resolver
  onOpenEntity, // (name, type, videoId?) => void — opens entity modal from App.jsx via setUniversalModalSafe
}) {
  // Auto-detect mode: if spotifyAlbumId or artist is set and no composer, it's an album
  const mode = modeProp || (spotifyAlbumId && !composer ? "album" : "film");

  // For films: which section are we in? "score" or "music"
  const [filmSection, setFilmSection] = useState(initialFilmSection === "music" ? "music" : "score");
  // For both: which player? "youtube" or "spotify"
  const [playerType, setPlayerType] = useState(spotifyAlbumId ? "spotify" : "youtube");
  // RWL pill state — null = collapsed, "discovery" = Featured Discovery open
  const [rwlTab, setRwlTab] = useState(null);
  useEffect(() => { setRwlTab(null); }, [title, isOpen]); // collapse pill when modal reopens or switches films

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scoreSoundtrack, setScoreSoundtrack] = useState(null);
  const [musicSoundtrack, setMusicSoundtrack] = useState(null);
  const [albumSoundtrack, setAlbumSoundtrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editScoreUrl, setEditScoreUrl] = useState("");
  const [editMusicUrl, setEditMusicUrl] = useState("");
  const [editScoreName, setEditScoreName] = useState("");
  const [editMusicName, setEditMusicName] = useState("");
  const [editScoreError, setEditScoreError] = useState(null);
  const [editMusicError, setEditMusicError] = useState(null);
  // Spotify cog fields — only rendered in film mode (hidden for harvested albums)
  const [editScoreSpotifyUrl, setEditScoreSpotifyUrl] = useState("");
  const [editMusicSpotifyUrl, setEditMusicSpotifyUrl] = useState("");
  const [editScoreSpotifyError, setEditScoreSpotifyError] = useState(null);
  const [editMusicSpotifyError, setEditMusicSpotifyError] = useState(null);
  // Track whether the Spotify fields were pre-filled when the cog opened. Used to detect
  // "user cleared the field" vs "user never set it" for the sentinel-based clear path.
  const [editScoreSpotifyWasSet, setEditScoreSpotifyWasSet] = useState(false);
  const [editMusicSpotifyWasSet, setEditMusicSpotifyWasSet] = useState(false);

  // Custom overrides from localStorage
  const [customScoreId, setCustomScoreId] = useState(null);
  const [customMusicId, setCustomMusicId] = useState(null);
  const [customScoreName, setCustomScoreName] = useState(null);
  const [customMusicName, setCustomMusicName] = useState(null);
  // Spotify album IDs from cog override. Empty string "" means user explicitly cleared (sentinel).
  const [customScoreSpotifyId, setCustomScoreSpotifyId] = useState(null);
  const [customMusicSpotifyId, setCustomMusicSpotifyId] = useState(null);
  const [customScoreSpotifyCleared, setCustomScoreSpotifyCleared] = useState(false);
  const [customMusicSpotifyCleared, setCustomMusicSpotifyCleared] = useState(false);

  // Current soundtrack based on mode and section
  const soundtrack = mode === "album" ? albumSoundtrack : (filmSection === "score" ? scoreSoundtrack : musicSoundtrack);
  const currentTrack = soundtrack?.tracks?.[currentTrackIndex] || null;

  const effectiveScoreId = customScoreId || scorePlaylistId;
  const effectiveMusicId = customMusicId || musicPlaylistId;

  // Spotify embed URL. Cog override wins over the passed spotifyAlbumId prop.
  // Empty-string sentinel (user explicitly cleared) hides Spotify entirely.
  // Album mode maps to the score slot — a film soundtrack opened as an album IS the score.
  // Override storage format: "album:ID" or "playlist:ID". Legacy bare 22-char = album.
  const _tabSpotifyOverride = (mode === "album" || filmSection !== "music") ? customScoreSpotifyId : customMusicSpotifyId;
  const _tabSpotifyCleared = (mode === "album" || filmSection !== "music") ? customScoreSpotifyCleared : customMusicSpotifyCleared;
  // Build embed URL honoring override type. _tabSpotifyOverride is already a prefixed string.
  // Fallback spotifyAlbumId prop is a bare ID (always album).
  const _spotifyOverrideParsed = (() => {
    if (!_tabSpotifyOverride) return null;
    const s = String(_tabSpotifyOverride);
    if (s.startsWith("playlist:")) return { type: "playlist", id: s.slice(9) };
    if (s.startsWith("album:")) return { type: "album", id: s.slice(6) };
    return { type: "album", id: s }; // legacy bare ID
  })();
  const spotifyEmbed = _tabSpotifyCleared
    ? null
    : (_spotifyOverrideParsed
      ? `https://open.spotify.com/embed/${_spotifyOverrideParsed.type}/${_spotifyOverrideParsed.id}?utm_source=generator&theme=0`
      : (spotifyAlbumId ? `https://open.spotify.com/embed/album/${spotifyAlbumId}?utm_source=generator&theme=0` : null));
  const effectiveSpotifyAlbumId = _tabSpotifyCleared ? null : (_spotifyOverrideParsed?.id || spotifyAlbumId);

  // Load custom overrides. Supports both legacy string ("PL...") and new object ({type, id}) shapes.
  // Spotify fields use empty-string sentinel: if "score_spotify" in stored, respect the user's choice
  // (including empty = explicitly cleared); if the key is missing, fall through to auto-lookup.
  useEffect(() => {
    setCustomScoreId(null); setCustomMusicId(null); setCustomScoreName(null); setCustomMusicName(null);
    setCustomScoreSpotifyId(null); setCustomMusicSpotifyId(null);
    setCustomScoreSpotifyCleared(false); setCustomMusicSpotifyCleared(false);
    if (title) {
      try {
        const stored = JSON.parse(localStorage.getItem(`soundtrack_overrides_${title.toLowerCase().replace(/\s+/g, "_")}`));
        // For display in the cog input, extract a display-friendly ID from either shape
        const _scoreDisplay = typeof stored?.score === "string" ? stored.score : stored?.score?.id || null;
        const _musicDisplay = typeof stored?.music === "string" ? stored.music : stored?.music?.id || null;
        if (_scoreDisplay) setCustomScoreId(_scoreDisplay);
        if (_musicDisplay) setCustomMusicId(_musicDisplay);
        if (stored?.scoreName) setCustomScoreName(stored.scoreName);
        if (stored?.musicName) setCustomMusicName(stored.musicName);
        // Spotify fields: key presence = user has set a choice; empty string = explicitly cleared
        if (stored && "score_spotify" in stored) {
          if (stored.score_spotify) setCustomScoreSpotifyId(stored.score_spotify);
          else setCustomScoreSpotifyCleared(true);
        }
        if (stored && "music_spotify" in stored) {
          if (stored.music_spotify) setCustomMusicSpotifyId(stored.music_spotify);
          else setCustomMusicSpotifyCleared(true);
        }
      } catch {}
    }
  }, [title]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentTrackIndex(0); setScoreSoundtrack(null); setMusicSoundtrack(null); setAlbumSoundtrack(null);
      setError(null); setIsEditing(false);
    }
  }, [isOpen]);

  // Set the right tab on open transition — Spotify when we have a Spotify album, YouTube otherwise.
  // Also honor initialFilmSection for round-trip from saved songs on the wall.
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFilmSection(initialFilmSection === "music" ? "music" : "score");
      setPlayerType(spotifyAlbumId ? "spotify" : "youtube");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, spotifyAlbumId, initialFilmSection]);

  // Reset track index on section/player change
  useEffect(() => { setCurrentTrackIndex(0); }, [filmSection, playerType]);

  // If prebuiltTracks provided, use them directly — skip all fetching
  useEffect(() => {
    if (!isOpen || !prebuiltTracks?.length) return;
    const hasVideo = prebuiltTracks.some(t => t.videoId);
    setAlbumSoundtrack({
      videoId: prebuiltTracks[0].videoId || null,
      title: title || "Album",
      channel: prebuiltTracks[0].channel || "",
      tracks: prebuiltTracks.map((t, i) => ({ title: t.title, videoId: t.videoId || null, duration: t.duration || "", thumbnail: t.thumbnail })),
    });
    setPlayerType(hasVideo ? "youtube" : "spotify");
  }, [isOpen, prebuiltTracks]);

  // prebuiltMusicFromTracks used as fallback inside fetchSoundtrack when SML returns nothing

  // Fetch when section changes
  useEffect(() => {
    if (!isOpen || !title) return;
    if (prebuiltTracks?.length) return; // skip fetch — using prebuilt data
    if (playerType === "spotify") return; // Spotify doesn't need playlist fetch
    if (mode === "album") {
      if (!albumSoundtrack) fetchSoundtrack("album");
    } else {
      if (filmSection === "score" && !scoreSoundtrack) fetchSoundtrack("score");
      if (filmSection === "music" && !musicSoundtrack) fetchSoundtrack("music");
    }
  }, [isOpen, title, filmSection, playerType, mode, effectiveScoreId, effectiveMusicId]);

  const fetchSoundtrack = async (type) => {
    // Clear stale state before fetching — prevents duplicate-key warnings from
    // old tracks mixing with new ones if two fetches race.
    if (type === "score") setScoreSoundtrack(null);
    else if (type === "music") setMusicSoundtrack(null);
    setLoading(true); setError(null);
    try {
      const searchType = type === "album" ? "album" : type;
      const comp = type === "album" ? (artist || composer || "") : (composer || "");
      // Read cog override directly from localStorage to avoid race with state hydration.
      // Supports both legacy string shape ("PL...") and new object shape ({type, id}).
      let overrideMedia = null;
      try {
        const stored = JSON.parse(localStorage.getItem(`soundtrack_overrides_${title.toLowerCase().replace(/\s+/g, "_")}`));
        const raw = type === "score" ? stored?.score : type === "music" ? stored?.music : null;
        if (typeof raw === "string") overrideMedia = { type: "playlist", id: raw };
        else if (raw?.id) overrideMedia = raw;
      } catch {}

      // Single-video override: synthesize a one-track playlist and skip findPlaylist entirely.
      if (overrideMedia?.type === "video") {
        const synthetic = {
          playlistId: null,
          playlistTitle: title,
          tracks: [{
            position: 1,
            videoId: overrideMedia.id,
            title: title,
            artist: comp || "",
            fullTitle: title,
            thumbnail: `https://i.ytimg.com/vi/${overrideMedia.id}/mqdefault.jpg`,
            channelTitle: "",
          }],
          trackCount: 1,
          embedUrl: `https://www.youtube.com/embed/${overrideMedia.id}?rel=0&enablejsapi=1`,
          url: `https://www.youtube.com/watch?v=${overrideMedia.id}`,
          searchType,
        };
        if (type === "score") setScoreSoundtrack(synthetic);
        else if (type === "music") setMusicSoundtrack(synthetic);
        setLoading(false);
        return;
      }

      const overrideId = overrideMedia?.type === "playlist" ? overrideMedia.id : null;
      const data = await findPlaylist(title, searchType, comp, overrideId);
      if (!data || (!data.tracks?.length && !data.embedUrl)) {
        if (type === "music" && prebuiltMusicFromTracks?.length) {
          // SML returned nothing — fall back to harvester needle drops
          setMusicSoundtrack({
            title: title || "Music From",
            tracks: prebuiltMusicFromTracks.map((t, i) => ({ title: t.title, artist: t.artist, videoId: t.videoId || null, spotifyTrackId: t.spotifyTrackId || null, thumbnail: t.thumbnail, position: i + 1 })),
          });
        } else {
          setError(`No ${type === "score" ? "original score" : type === "music" ? "soundtrack" : "album"} playlist found`);
        }
      } else {
        if (type === "score") setScoreSoundtrack(data);
        else if (type === "music") setMusicSoundtrack(data);
        else setAlbumSoundtrack(data);
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  const playNext = () => { if (soundtrack && currentTrackIndex < soundtrack.tracks.length - 1) setCurrentTrackIndex(currentTrackIndex + 1); };
  const playPrevious = () => { if (currentTrackIndex > 0) setCurrentTrackIndex(currentTrackIndex - 1); };

  // Parse a Spotify input. Accepts album URLs, playlist URLs, or raw 22-char IDs.
  // Returns a prefixed string "album:ID" or "playlist:ID", or null if invalid.
  // Raw 22-char IDs default to album (matches legacy behavior).
  const extractSpotifyRef = (input) => {
    if (!input?.trim()) return null;
    const trimmed = input.trim();
    const albumMatch = trimmed.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]{22})/);
    if (albumMatch) return `album:${albumMatch[1]}`;
    const playlistMatch = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]{22})/);
    if (playlistMatch) return `playlist:${playlistMatch[1]}`;
    if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return `album:${trimmed}`;
    return null;
  };

  // Parse a cog input into a media reference. Returns { type: "playlist"|"video", id } or null.
  // Priority: explicit video in URL (v= or youtu.be) beats auto-generated radio list=RD...
  // Accepts all playlist prefixes (PL, RD, OLAK, UU, LL, FL, etc.)
  const extractMediaId = (input) => {
    if (!input?.trim()) return null;
    const trimmed = input.trim();
    // youtu.be/VIDEO_ID short URL — prefer video over any &list=RD radio mix
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return { type: "video", id: shortMatch[1] };
    // youtube.com/watch?v=VIDEO_ID — prefer video over &list=RD radio mix
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return { type: "video", id: watchMatch[1] };
    // Raw playlist ID (any uppercase prefix: PL, RD, OLAK, UU, LL, FL, etc.)
    if (/^[A-Z]{2,}[a-zA-Z0-9_-]+$/.test(trimmed)) return { type: "playlist", id: trimmed };
    // Full URL with list= param but no v= (pure playlist URL)
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) return { type: "playlist", id: listMatch[1] };
    // Raw 11-char video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return { type: "video", id: trimmed };
    return null;
  };

  const handleSaveOverrides = () => {
    setEditScoreError(null); setEditMusicError(null);
    setEditScoreSpotifyError(null); setEditMusicSpotifyError(null);
    const key = `soundtrack_overrides_${title.toLowerCase().replace(/\s+/g, "_")}`;

    // Parse whatever the user typed. If user typed something but parse fails, show error and block save.
    let scoreMedia = null;
    let musicMedia = null;
    if (editScoreUrl?.trim()) {
      scoreMedia = extractMediaId(editScoreUrl);
      if (!scoreMedia) { setEditScoreError("Not a valid YouTube playlist URL, video URL, or ID"); return; }
    }
    if (editMusicUrl?.trim()) {
      musicMedia = extractMediaId(editMusicUrl);
      if (!musicMedia) { setEditMusicError("Not a valid YouTube playlist URL, video URL, or ID"); return; }
    }

    // Parse Spotify fields. If user typed garbage, show error and block save.
    // If user cleared a previously-set field, write empty-string sentinel to block auto-lookup.
    let scoreSpotifyId = null, musicSpotifyId = null;
    let scoreSpotifyCleared = false, musicSpotifyCleared = false;
    if (editScoreSpotifyUrl?.trim()) {
      scoreSpotifyId = extractSpotifyRef(editScoreSpotifyUrl);
      if (!scoreSpotifyId) { setEditScoreSpotifyError("Not a valid Spotify album or playlist URL"); return; }
    } else if (editScoreSpotifyWasSet) {
      // Field was pre-filled when cog opened, user cleared it — write sentinel
      scoreSpotifyCleared = true;
    }
    if (editMusicSpotifyUrl?.trim()) {
      musicSpotifyId = extractSpotifyRef(editMusicSpotifyUrl);
      if (!musicSpotifyId) { setEditMusicSpotifyError("Not a valid Spotify album or playlist URL"); return; }
    } else if (editMusicSpotifyWasSet) {
      musicSpotifyCleared = true;
    }

    // Merge with existing localStorage — only update fields the user provided. Never clobber untouched fields.
    let existing = {};
    try { existing = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
    const overrides = { ...existing };
    if (scoreMedia) overrides.score = scoreMedia;
    if (musicMedia) overrides.music = musicMedia;
    if (editScoreName.trim()) overrides.scoreName = editScoreName.trim();
    if (editMusicName.trim()) overrides.musicName = editMusicName.trim();
    // Spotify fields: set ID when user provided one, set empty-string sentinel when cleared,
    // leave key untouched when user didn't interact (auto-lookup still runs on next open).
    if (scoreSpotifyId) overrides.score_spotify = scoreSpotifyId;
    else if (scoreSpotifyCleared) overrides.score_spotify = "";
    if (musicSpotifyId) overrides.music_spotify = musicSpotifyId;
    else if (musicSpotifyCleared) overrides.music_spotify = "";
    localStorage.setItem(key, JSON.stringify(overrides));

    // Update state only for fields the user provided. Don't null out untouched fields.
    if (scoreMedia) setCustomScoreId(scoreMedia.id);
    if (musicMedia) setCustomMusicId(musicMedia.id);
    if (editScoreName.trim()) setCustomScoreName(editScoreName.trim());
    if (editMusicName.trim()) setCustomMusicName(editMusicName.trim());
    // Spotify state mirrors localStorage
    if (scoreSpotifyId) { setCustomScoreSpotifyId(scoreSpotifyId); setCustomScoreSpotifyCleared(false); }
    else if (scoreSpotifyCleared) { setCustomScoreSpotifyId(null); setCustomScoreSpotifyCleared(true); }
    if (musicSpotifyId) { setCustomMusicSpotifyId(musicSpotifyId); setCustomMusicSpotifyCleared(false); }
    else if (musicSpotifyCleared) { setCustomMusicSpotifyId(null); setCustomMusicSpotifyCleared(true); }

    // Clear soundtrack state so fetch re-runs with the new overrides
    setScoreSoundtrack(null); setMusicSoundtrack(null); setAlbumSoundtrack(null);
    setIsEditing(false);
  };

  // Canonical track save key: prefer videoId (stable, globally unique), fall back to spotifyTrackId.
  // Read and write must use the same key format — no loose matching.
  const trackSaveKey = (track) => {
    if (track?.videoId) return `youtube:${track.videoId}`;
    if (track?.spotifyTrackId) return `spotify:${track.spotifyTrackId}`;
    return null;
  };

  const handleToggleSave = (track) => {
    if (!toggleLibrary) return;
    const saveKey = trackSaveKey(track);
    if (!saveKey) return; // track has no playable ID — can't save
    toggleLibrary(saveKey, {
      category: "Music",
      type: "SONG",
      title: track.title,
      subtitle: track.artist || artist,
      videoId: track.videoId,
      spotifyTrackId: track.spotifyTrackId,
      thumbnail: track.thumbnail,
      addedFrom: "Full Player",
      discoveredIn: title,
      discoveredInUniverse: universe,
      // Round-trip routing: tells the wall click handler to open the song modal
      // with Soundtrack + Film discovery cards injected via routing meta.
      sourceFilmTitle: title,
      sourceFilmTab: filmSection,
      sourceUniverse: universe,
    });
  };

  const isTrackSaved = (track) => {
    if (!library) return false;
    const key = trackSaveKey(track);
    return key ? !!library[key] : false;
  };

  // Whether the parent soundtrack/score is saved as a whole — used to gate per-track hearts
  // so users aren't confused about whether they need to heart each track individually.
  const soundtrackKey = title ? `soundtrack:${title}:${filmSection}` : null;
  const soundtrackCovered = !!(soundtrackKey && library?.[soundtrackKey]);

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)" }} onClick={onClose} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a1a", borderRadius: 12, width: "80vw", height: "80vh", maxWidth: 1400, maxHeight: 850 }}>

        {/* Header */}
        <div style={{ background: "#222", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎵</span>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>{title}</h2>
                {(artist || composer) && <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{artist || composer}{year ? ` · ${year}` : ""}</div>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => {
                setEditScoreUrl(effectiveScoreId || "");
                setEditMusicUrl(effectiveMusicId || "");
                setEditScoreName(customScoreName || "");
                setEditMusicName(customMusicName || "");
                // Pre-fill Spotify fields with current cog value (not auto-lookup — that's a separate source).
                // Stored format is "album:ID" or "playlist:ID" — reconstruct the original URL for display.
                // If the user explicitly cleared, the field stays empty AND we set wasSet=true so a re-save keeps the sentinel.
                const _rehydrate = (ref) => {
                  if (!ref) return "";
                  const s = String(ref);
                  if (s.startsWith("playlist:")) return `https://open.spotify.com/playlist/${s.slice(9)}`;
                  if (s.startsWith("album:")) return `https://open.spotify.com/album/${s.slice(6)}`;
                  return `https://open.spotify.com/album/${s}`; // legacy bare ID
                };
                setEditScoreSpotifyUrl(_rehydrate(customScoreSpotifyId));
                setEditMusicSpotifyUrl(_rehydrate(customMusicSpotifyId));
                setEditScoreSpotifyWasSet(!!customScoreSpotifyId || customScoreSpotifyCleared);
                setEditMusicSpotifyWasSet(!!customMusicSpotifyId || customMusicSpotifyCleared);
                setEditScoreError(null); setEditMusicError(null);
                setEditScoreSpotifyError(null); setEditMusicSpotifyError(null);
                setIsEditing(!isEditing);
              }}
                style={{ background: isEditing ? "#6b7280" : "#8b5cf6", color: "#fff", padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⚙</button>
              {soundtrack && playerType === "youtube" && (
                <span style={{ background: "#3b82f6", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 14, fontWeight: 600 }}>
                  Track {currentTrackIndex + 1} of {soundtrack.tracks.length}
                </span>
              )}
              <button onClick={onClose} style={{ background: "#ef4444", color: "#fff", padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✕ Close</button>
            </div>
          </div>

          {/* Edit Panel */}
          {isEditing && (
            <div style={{ background: "#2d2d2d", padding: "12px 24px", borderBottom: "1px solid #444" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ color: "#fff", fontSize: 12, fontWeight: 600, minWidth: 60 }}>🎼 Tab 1:</label>
                  <input value={editScoreName} onChange={(e) => setEditScoreName(e.target.value)} placeholder="Tab name" style={{ width: 150, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: "1px solid #555", background: "#1a1a1a", color: "#fff" }} />
                  <input value={editScoreUrl} onChange={(e) => { setEditScoreUrl(e.target.value); if (editScoreError) setEditScoreError(null); }} placeholder="YouTube playlist or video URL / ID" style={{ flex: 1, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: `1px solid ${editScoreError ? "#ef4444" : "#555"}`, background: "#1a1a1a", color: "#fff" }} />
                </div>
                {editScoreError && <div style={{ color: "#f87171", fontSize: 11, marginLeft: 68 }}>{editScoreError}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ color: "#fff", fontSize: 12, fontWeight: 600, minWidth: 60 }}>🎧 Tab 2:</label>
                  <input value={editMusicName} onChange={(e) => setEditMusicName(e.target.value)} placeholder="Tab name" style={{ width: 150, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: "1px solid #555", background: "#1a1a1a", color: "#fff" }} />
                  <input value={editMusicUrl} onChange={(e) => { setEditMusicUrl(e.target.value); if (editMusicError) setEditMusicError(null); }} placeholder="YouTube playlist or video URL / ID" style={{ flex: 1, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: `1px solid ${editMusicError ? "#ef4444" : "#555"}`, background: "#1a1a1a", color: "#fff" }} />
                </div>
                {editMusicError && <div style={{ color: "#f87171", fontSize: 11, marginLeft: 68 }}>{editMusicError}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, paddingTop: 8, borderTop: "1px solid #444" }}>
                  <label style={{ color: "#fff", fontSize: 12, fontWeight: 600, minWidth: 60 }}>{mode === "album" ? "🎵 Spotify:" : "🎼 Spotify:"}</label>
                  <div style={{ width: 150 }} />
                  <input value={editScoreSpotifyUrl} onChange={(e) => { setEditScoreSpotifyUrl(e.target.value); if (editScoreSpotifyError) setEditScoreSpotifyError(null); }} placeholder="Spotify album URL or ID (optional — clear to hide)" style={{ flex: 1, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: `1px solid ${editScoreSpotifyError ? "#ef4444" : "#555"}`, background: "#1a1a1a", color: "#fff" }} />
                </div>
                {editScoreSpotifyError && <div style={{ color: "#f87171", fontSize: 11, marginLeft: 68 }}>{editScoreSpotifyError}</div>}
                {mode !== "album" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ color: "#fff", fontSize: 12, fontWeight: 600, minWidth: 60 }}>🎧 Spotify:</label>
                      <div style={{ width: 150 }} />
                      <input value={editMusicSpotifyUrl} onChange={(e) => { setEditMusicSpotifyUrl(e.target.value); if (editMusicSpotifyError) setEditMusicSpotifyError(null); }} placeholder="Spotify album URL or ID (optional — clear to hide)" style={{ flex: 1, padding: "6px 10px", fontSize: 12, borderRadius: 4, border: `1px solid ${editMusicSpotifyError ? "#ef4444" : "#555"}`, background: "#1a1a1a", color: "#fff" }} />
                    </div>
                    {editMusicSpotifyError && <div style={{ color: "#f87171", fontSize: 11, marginLeft: 68 }}>{editMusicSpotifyError}</div>}
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <button onClick={() => setIsEditing(false)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 4, border: "none", background: "#555", color: "#fff", cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSaveOverrides} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 4, border: "none", background: "#10b981", color: "#fff", cursor: "pointer" }}>Save & Reload</button>
                </div>
              </div>
            </div>
          )}

          {/* Featured Discovery pill + content moved BELOW the player area */}

          {/* Tabs */}
          <div style={{ display: "flex", padding: "0 24px", gap: 4, alignItems: "flex-end" }}>
            {mode === "film" ? (
              <>
                {/* Film mode: section tabs (Score / Music From) */}
                <button onClick={() => setFilmSection("score")} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", background: filmSection === "score" ? "#1a1a1a" : "transparent", color: filmSection === "score" ? "#fff" : "#888", borderBottom: filmSection === "score" ? "3px solid #3b82f6" : "3px solid transparent" }}>
                  🎼 {customScoreName || "Original Score"}
                </button>
                <button onClick={() => setFilmSection("music")} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", background: filmSection === "music" ? "#1a1a1a" : "transparent", color: filmSection === "music" ? "#fff" : "#888", borderBottom: filmSection === "music" ? "3px solid #10b981" : "3px solid transparent" }}>
                  🎧 {customMusicName || "Music From"}
                </button>
                <div style={{ flex: 1 }} />
                {/* Player type toggle */}
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <button onClick={() => setPlayerType("youtube")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, border: `2px solid ${playerType === "youtube" ? "#ff0000" : "#555"}`, borderRadius: 6, background: playerType === "youtube" ? "#ff0000" : "transparent", color: playerType === "youtube" ? "#fff" : "#888", cursor: "pointer" }}>▶ YouTube</button>
                  <button onClick={() => setPlayerType("spotify")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, border: `2px solid ${playerType === "spotify" ? "#1db954" : "#555"}`, borderRadius: 6, background: playerType === "spotify" ? "#1db954" : "transparent", color: playerType === "spotify" ? "#fff" : "#888", cursor: "pointer" }}>🎵 Spotify</button>
                </div>
              </>
            ) : (
              <>
                {/* Album mode: just player type toggle */}
                <button onClick={() => setPlayerType("spotify")} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", background: playerType === "spotify" ? "#1a1a1a" : "transparent", color: playerType === "spotify" ? "#fff" : "#888", borderBottom: playerType === "spotify" ? "3px solid #1db954" : "3px solid transparent" }}>
                  🎵 Spotify
                </button>
                <button onClick={() => setPlayerType("youtube")} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", background: playerType === "youtube" ? "#1a1a1a" : "transparent", color: playerType === "youtube" ? "#fff" : "#888", borderBottom: playerType === "youtube" ? "3px solid #ff0000" : "3px solid transparent" }}>
                  ▶ YouTube
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>🎵</div><div>Loading...</div></div>
            </div>
          )}

          {/* Error */}
          {error && !loading && playerType === "youtube" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
              <p style={{ fontSize: 16 }}>{error}</p>
              <button onClick={() => { setError(null); fetchSoundtrack(mode === "album" ? "album" : filmSection); }} style={{ marginTop: 12, padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Try Again</button>
            </div>
          )}

          {/* Spotify view */}
          {playerType === "spotify" && spotifyEmbed && (() => {
            const albumSaveKey = `${title} — ${artist || composer || ""}`;
            const albumMeta = { category: "Music", type: "ALBUM", title, subtitle: artist || composer, spotifyAlbumId, thumbnail: prebuiltTracks?.[0]?.thumbnail || soundtrack?.thumbnail, addedFrom: "Full Player", discoveredIn: title, discoveredInUniverse: universe };
            const albumSaved = !!library?.[albumSaveKey] || !!library?.[title] || Object.keys(library || {}).some(k => k.startsWith(`${title} — `));
            return (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Add to My Stuff bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "#222", borderBottom: "1px solid #333" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => toggleLibrary?.(albumSaveKey, albumMeta)}
                      style={{ background: albumSaved ? "#dc2626" : "transparent", border: albumSaved ? "none" : "2px solid #555", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, transition: "all 0.2s" }}
                      title={albumSaved ? "Remove from My Stuff" : "Add to My Stuff"}>
                      {albumSaved ? "❤️" : "🤍"}
                    </button>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{artist || composer}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleLibrary?.(albumSaveKey, albumMeta)}
                    style={{ padding: "6px 16px", borderRadius: 6, background: albumSaved ? "#dc2626" : "#f5b800", color: albumSaved ? "#fff" : "#1a2744", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {albumSaved ? "Remove from My Stuff" : "+ Add Album to My Stuff"}
                  </button>
                </div>
                {/* Spotify embed */}
                <div style={{ flex: 1, padding: "0 20px 20px" }}>
                  <iframe src={spotifyEmbed} width="100%" height="100%" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style={{ borderRadius: 8 }} title={`${title} on Spotify`} />
                </div>
              </div>
            );
          })()}

          {playerType === "spotify" && !spotifyEmbed && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div><p style={{ fontSize: 16 }}>No Spotify album found for {title}</p></div>
            </div>
          )}

          {/* YouTube view with track listing */}
          {playerType === "youtube" && soundtrack && !loading && (
            <div style={{ display: "flex", height: "100%" }}>
              {/* Left: Video Player (70%) */}
              <div style={{ flex: "1 1 70%", padding: 20, borderRight: "1px solid #333", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, minHeight: 0 }}>
                  {currentTrack?.videoId ? (
                    <iframe key={currentTrack.videoId} src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&rel=0&enablejsapi=1`}
                      style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: "#000" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : currentTrack?.spotifyTrackId ? (
                    <iframe key={currentTrack.spotifyTrackId} src={`https://open.spotify.com/embed/track/${currentTrack.spotifyTrackId}?utm_source=generator&theme=0`}
                      style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: "#000" }}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#2a2a2a", borderRadius: 8, color: "#888" }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>❌</div><div>Video not found</div></div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, padding: 8 }}>
                  <button onClick={playPrevious} disabled={currentTrackIndex === 0}
                    style={{ background: currentTrackIndex === 0 ? "#444" : "#555", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", cursor: currentTrackIndex === 0 ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 600, opacity: currentTrackIndex === 0 ? 0.5 : 1 }}>⏮ Previous</button>
                  <button onClick={playNext} disabled={!soundtrack || currentTrackIndex === soundtrack.tracks.length - 1}
                    style={{ background: (!soundtrack || currentTrackIndex === soundtrack.tracks.length - 1) ? "#444" : "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", cursor: (!soundtrack || currentTrackIndex === soundtrack.tracks.length - 1) ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 600, opacity: (!soundtrack || currentTrackIndex === soundtrack.tracks.length - 1) ? 0.5 : 1 }}>Next ⏭</button>
                </div>
              </div>

              {/* Right: Track List (30%) */}
              <div style={{ flex: "0 0 30%", minWidth: 260, background: "#222", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{mode === "album" ? "Album Tracks" : "Playlist Tracks"}</h3>
                  {toggleLibrary && mode !== "album" && (() => {
                    // Save the soundtrack as a single wall tile representing the whole playlist.
                    // Key format: soundtrack:${filmTitle}:${filmSection} — no universe segment, so
                    // cross-universe opens don't create duplicate tiles.
                    const saved = soundtrackCovered;
                    const isScoreSection = filmSection === "score";
                    const unsavedLabel = isScoreSection ? "+ Save Score" : "+ Save Soundtrack";
                    const savedLabel = "✓ Saved to My Stuff";
                    return (
                      <button onClick={() => {
                        if (saved) {
                          toggleLibrary(soundtrackKey);
                        } else {
                          const firstTrack = soundtrack.tracks[0] || {};
                          toggleLibrary(soundtrackKey, {
                            category: "Music",
                            type: "SOUNDTRACK",
                            title: `${title} — ${isScoreSection ? "Original Score" : "Music From"}`,
                            subtitle: composer || "",
                            thumbnail: firstTrack.thumbnail || soundtrack.thumbnail || null,
                            playlistId: soundtrack.playlistId || null,
                            videoId: (!soundtrack.playlistId && firstTrack.videoId) ? firstTrack.videoId : null,
                            discoveredIn: title,
                            discoveredInUniverse: universe,
                            addedFrom: "Soundtrack & Score",
                            // Round-trip routing: SOUNDTRACK tiles open as album modal;
                            // these fields tell the wall click handler which film/tab to route to.
                            sourceFilmTitle: title,
                            sourceFilmTab: filmSection,
                            sourceUniverse: universe,
                            spotifyAlbumId: spotifyAlbumId || null,
                          });
                        }
                      }} style={{
                        padding: "6px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: saved ? "1px solid #16803c" : "1px solid #f5b800",
                        background: saved ? "#16803c" : "transparent",
                        color: saved ? "#fff" : "#f5b800",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                        title={saved ? "Click to remove from My Stuff" : ""}>
                        {saved ? savedLabel : unsavedLabel}
                      </button>
                    );
                  })()}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
                  {soundtrack.tracks.map((track, idx) => (
                    <div key={track.videoId || idx} onClick={() => setCurrentTrackIndex(idx)}
                      style={{ background: idx === currentTrackIndex ? "#3b82f6" : "#333", padding: 10, borderRadius: 6, cursor: "pointer", marginBottom: 4, border: idx === currentTrackIndex ? "2px solid #60a5fa" : "2px solid transparent", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: idx === currentTrackIndex ? "#bfdbfe" : "#888", marginBottom: 2 }}>Track {idx + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#10b981", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist || artist}</div>
                          {track.videoId ? (
                            <div style={{ fontSize: 10, color: idx === currentTrackIndex ? "#bfdbfe" : "#10b981", marginTop: 2 }}>✓ YouTube</div>
                          ) : track.spotifyTrackId ? (
                            <div style={{ fontSize: 10, color: idx === currentTrackIndex ? "#bfdbfe" : "#1db954", marginTop: 2 }}>✓ Spotify</div>
                          ) : (
                            <div style={{ fontSize: 10, color: "#f87171", marginTop: 2 }}>✗ No media</div>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); if (!soundtrackCovered) handleToggleSave(track); }}
                          disabled={soundtrackCovered}
                          style={{ background: "transparent", border: "none", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: soundtrackCovered ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.2s", fontSize: soundtrackCovered ? 20 : 17, color: soundtrackCovered ? "#16803c" : undefined, fontWeight: soundtrackCovered ? 900 : undefined }}
                          title={soundtrackCovered ? "Included in saved soundtrack — remove the soundtrack save to heart individual tracks" : (isTrackSaved(track) ? "Remove from My Stuff" : "Save to My Stuff")}>
                          {soundtrackCovered ? "✓" : (isTrackSaved(track) ? "❤️" : "🤍")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "8px 16px", borderTop: "1px solid #444", textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "#999", margin: 0 }}>Click ❤️ to save · click again to remove</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Featured Discovery — absolute-positioned drawer overlay at the bottom.
            Player dimensions NEVER change. Pill row is a thin bar (~40px) when collapsed.
            When user clicks the pill, card content slides up as a drawer overlaying the
            bottom of the player. Clicking the pill again or the × collapses it. ═══ */}
        {(() => {
          if (!enrichedCatalogContent?.length || !title) return null;
          const _norm = (s) => (s || "").toLowerCase().trim();
          const parentFilm = enrichedCatalogContent.find(ci => _norm(ci.title) === _norm(title));
          if (!parentFilm) return null;
          const creatorWorks = parentFilm.creator
            ? enrichedCatalogContent.filter(ci => ci.creator === parentFilm.creator && ci.title !== parentFilm.title && ci.tmdb?.poster_url).slice(0, 12)
            : [];
          const tmdbVids = (parentFilm.tmdb?.videos || []).filter(v => v.key || v.video_id);
          const totalCards = 1 + creatorWorks.length + tmdbVids.length;
          if (totalCards <= 1) return null;
          return (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
              {/* Pill bar — always visible */}
              <div style={{ padding: "6px 24px", background: "rgba(26,26,26,0.95)", borderTop: "1px solid #333", display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setRwlTab(rwlTab === "discovery" ? null : "discovery")}
                  style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${rwlTab === "discovery" ? "#f5b800" : "#555"}`, background: rwlTab === "discovery" ? "#2a2416" : "transparent", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                >
                  Featured Discovery ({totalCards - 1})
                </button>
              </div>
              {/* Drawer content — overlays bottom of player when expanded */}
              {rwlTab === "discovery" && (
                <div style={{ background: "rgba(26,26,26,0.97)", borderTop: "1px solid #444", padding: "10px 24px 14px", maxHeight: 260, overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <button onClick={() => setRwlTab(null)} style={{ background: "none", border: "none", color: "#888", fontSize: 16, cursor: "pointer", padding: "0 4px" }} title="Close">×</button>
                  </div>
                  {/* Inline GoldAdd — duplicated from UniversalModal (can't import, it's defined inside UniversalModal's closure) */}
                  {(() => {
                    const inLib = (t) => !!(library && library[t]);
                    const _goldAdd = (cardTitle, meta) => (
                      <button onClick={(e) => { e.stopPropagation(); toggleLibrary?.(cardTitle, meta || undefined); }}
                        style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid #f5b800`, background: inLib(cardTitle) ? "#f5b800" : "transparent", color: inLib(cardTitle) ? "#1a2744" : "#f5b800", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                        {inLib(cardTitle) ? "✓" : "+"}
                      </button>
                    );
                    // All cards in one strip — exact same JSX pattern as UniversalModal Related tab (line ~3210).
                    // Dimensions: 120x160 poster, GoldAdd below, title, subtitle, type badge.
                    // Dark theme adaptation: white text instead of navy, dark fallback backgrounds.
                    const allCards = [
                      // Parent film — ALWAYS first, gold border on poster
                      { key: "parent", title: parentFilm.title, poster: parentFilm.tmdb?.poster_url, subtitle: parentFilm.creator, type: parentFilm.type || "film", isParent: true },
                      // Creator's other works
                      ...creatorWorks.map((w, i) => ({ key: `cw-${i}`, title: w.title, poster: w.tmdb?.poster_url, subtitle: w.tmdb?.release_date?.slice(0, 4) || "", type: w.type || "film" })),
                    ];
                    const _badgeColor = (t) => {
                      const T = (t || "").toLowerCase();
                      if (T === "film" || T === "movie" || T === "documentary") return "#E53935";
                      if (T === "tv-series" || T === "tv_series") return "#E53935";
                      if (T === "album" || T === "song") return "#16803c";
                      if (T === "book") return "#1565c0";
                      return "#4b5563";
                    };
                    const _badgeLabel = (t) => {
                      const T = (t || "").toLowerCase();
                      if (T === "film" || T === "movie" || T === "documentary") return "FILM";
                      if (T === "tv-series" || T === "tv_series") return "TV";
                      if (T === "song") return "SONG";
                      return (t || "ITEM").toUpperCase();
                    };
                    return (
                      <div data-dc-row style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "thin" }}>
                        {allCards.map((c) => (
                          <div key={c.key} onClick={() => onOpenEntity?.(c.title, c.type)} style={{ minWidth: 120, maxWidth: 120, flexShrink: 0, cursor: "pointer" }}>
                            <div style={{ width: 120, height: 160, borderRadius: 8, overflow: "hidden", background: "#1a2744", marginBottom: 6, border: c.isParent ? "2px solid #f5b800" : "none" }}>
                              {c.poster ? <img src={c.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.onerror = null; e.target.style.display = "none"; e.target.parentElement.style.display = "flex"; e.target.parentElement.style.alignItems = "center"; e.target.parentElement.style.justifyContent = "center"; e.target.parentElement.innerHTML = `<span style="color:#fff;font-size:11px;font-weight:600;text-align:center;padding:8px">${c.title}</span>`; }} /> : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, textAlign: "center", padding: 8 }}>{c.title}</div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                              {_goldAdd(c.title, { title: c.title, subtitle: c.subtitle || "", category: "Movies & TV", type: _badgeLabel(c.type), thumbnail: c.poster || null, addedFrom: `Soundtrack · ${title} · Discovery`, dateAdded: Date.now() })}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                            <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subtitle || ""}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <span style={{ fontSize: 7.5, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#fff", background: _badgeColor(c.type), padding: "2px 5px", borderRadius: 3, display: "inline-block" }}>{_badgeLabel(c.type)}</span>
                            </div>
                          </div>
                        ))}
                        {/* TMDB trailers + featurettes — same 120x160 card shape, YouTube thumbnail */}
                        {tmdbVids.map((v, i) => {
                          const vid = v.key || v.video_id;
                          const thumb = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
                          const vTitle = v.name || v.video_title || "Video";
                          const vType = v.type || "VIDEO";
                          return (
                            <div key={`tv-${i}`} onClick={() => onOpenEntity?.(vTitle, "video", vid)} style={{ minWidth: 120, maxWidth: 120, flexShrink: 0, cursor: "pointer" }}>
                              <div style={{ width: 120, height: 160, borderRadius: 8, overflow: "hidden", background: "#1a2744", marginBottom: 6 }}>
                                <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={e => { e.target.onerror = null; e.target.style.display = "none"; e.target.parentElement.style.display = "flex"; e.target.parentElement.style.alignItems = "center"; e.target.parentElement.style.justifyContent = "center"; e.target.parentElement.innerHTML = `<span style="color:#fff;font-size:11px;font-weight:600;text-align:center;padding:8px">${vTitle}</span>`; }}
                                  onLoad={e => { if (e.target.naturalWidth <= 120 && e.target.naturalHeight <= 90) { e.target.style.display = "none"; e.target.parentElement.style.display = "flex"; e.target.parentElement.style.alignItems = "center"; e.target.parentElement.style.justifyContent = "center"; e.target.parentElement.innerHTML = `<span style="color:#fff;font-size:11px;font-weight:600;text-align:center;padding:8px">${vTitle}</span>`; } }} />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                                {_goldAdd(vTitle, { title: vTitle, subtitle: "", category: "Video & Podcasts", type: vType, videoId: vid, thumbnail: thumb, addedFrom: `Soundtrack · ${title} · Discovery`, dateAdded: Date.now() })}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vTitle}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <span style={{ fontSize: 7.5, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#fff", background: vType === "Trailer" ? "#E53935" : "#7c3aed", padding: "2px 5px", borderRadius: 3, display: "inline-block" }}>{vType.toUpperCase()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>,
    document.body
  );
}
