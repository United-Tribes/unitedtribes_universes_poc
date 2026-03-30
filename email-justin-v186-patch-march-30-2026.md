# Email to Justin — v1.8.6 Patch

**Subject:** v1.8.6 patch — video discovery search (pull main again)

---

Hey Justin,

Pushed a patch to main. After sending the first email I realized there was no way to actually find the Ryan Coogler Criterion Closet video from the UI — you couldn't get to the new catalog modal feature without already knowing where the video was.

**The fix:** The My Stuff search bar now searches across all 815 video titles in all 5 universes. Type "criterion" and you'll see "Ryan Coogler's Closet Picks" immediately. Click the [+] to add it to your collection, or click the title to open the modal with the discovery chevron.

To get the patch:

```bash
cd ~/Desktop/unitedtribes_universes_poc
git pull origin main
```

Try it: go to My Stuff → type "criterion" → click the result → expand the discovery chevron → click any film.

Also works for "spike lee", "coogler", "blues", "patti smith", "sinners", etc.

—J.D.
