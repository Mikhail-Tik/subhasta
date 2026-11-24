# The border snapshots

The files `<year>.json` and `all.json` in this folder are modified versions of the GeoJSON basemaps of
**aourednik/historical-basemaps** (https://github.com/aourednik/historical-basemaps, HEAD 4b5039e of 2 November 2026),
which are released under the **GNU General Public License v3.0** (the full text is in `LICENSE` beside this file).

Modified by the Subhasta desk on 23 November 2026 with `tools/gen_history_borders.py`: the polygons were simplified
(Douglas–Peucker, 0.35°), quantised to hundredths of a degree and delta-encoded; unnamed features were left out; the
smallest polities were dropped where a year exceeded 60 KB (`min_a` records the floor); a label point and an area were added.
These files are conveyed under the same licence, GPL-3.0. The source data is a work in progress by its authors, who ask that the
maps be verified against other sources before academic use; Subhasta shows them as an orientation, not as a record.
