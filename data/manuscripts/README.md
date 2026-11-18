# Labelled historic manuscripts (de / fr / en)

Version 1 (200 train / 50 test pages per group). Download with `./data/download_manuscripts.sh`.

Each page is stored as `<split>/<group>/<page_id>.{jpg|png,xml,txt}`: the page image, the original PAGE/ALTO ground truth (segmentation + transcription, `imageFilename` re-pointed to the renamed image) and the plain page transcription. All labels are in `metadata.csv`.

## Groups

| group         | language | period | train pages | test pages | train docs | test docs | sources                                                                                                                                      |
| ------------- | -------- | ------ | ----------: | ---------: | ---------: | --------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `de_post1700` | de       | ≥ 1700 |         200 |         50 |         64 |        12 | mkn_kurrent, valais_de                                                                                                                       |
| `de_pre1700`  | de       | < 1700 |         196 |         50 |         63 |        35 | canonesses_fol1045, canonesses_oct842, dresden_hofdiarium, enhg_lit463, koenigsfelden, stabs_basel                                           |
| `en_post1800` | en       | ≥ 1800 |         200 |         50 |        198 |        38 | denver_jcrs, joseph_hooker                                                                                                                   |
| `en_pre1800`  | en       | < 1800 |         200 |         50 |        179 |        33 | revolutionary_city                                                                                                                           |
| `fr_post1700` | fr       | ≥ 1700 |         199 |         50 |         93 |        23 | berlioz, cremma_mss18, cremma_mss19, fondue_fr_mss18, lectaurep_bronod, lectaurep_mariages, poilus_testaments, revolutionary_city, valais_fr |
| `fr_pre1700`  | fr       | < 1700 |         200 |         50 |         61 |        11 | chateau_chavigny, cremma_medieval, cremma_mss16, cremma_mss17, decameron_fr, gallicorpora_15e, htromance_medieval_fr                         |

## Sources

| source                                                                                                 | pages | years (min–max) | licence                            | link                                                                                |
| ------------------------------------------------------------------------------------------------------ | ----: | --------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `berlioz` – Projet Correspondance Berlioz                                                              |    12 | 1823–1844       | CC-BY-4.0                          | https://github.com/PSL-Chartes-HTR-Students/TNAH-2021-Projet-Correspondance-Berlioz |
| `canonesses_fol1045` – Augustinian canonesses manuscripts: Ms. germ. fol. 1045 (15th c.)               |    30 | 1400–1499       | CC-BY-4.0                          | https://zenodo.org/records/17978574                                                 |
| `canonesses_oct842` – Augustinian canonesses manuscripts: Ms. germ. oct. 842 (15th c.)                 |    29 | 1400–1499       | CC-BY-4.0                          | https://zenodo.org/records/17978574                                                 |
| `chateau_chavigny` – Château de Chavigny                                                               |     6 | 1568–1599       | CC-BY-4.0                          | https://github.com/PSL-Chartes-HTR-Students/HN2021-ChateauChavigny                  |
| `cremma_medieval` – CREMMA Medieval                                                                    |    60 | 1100–1499       | CC-BY-4.0                          | https://github.com/HTR-United/cremma-medieval                                       |
| `cremma_mss16` – CREMMA MSS 16                                                                         |     9 | 1500–1599       | CC-BY-4.0                          | https://github.com/HTR-United/CREMMA-MSS-16                                         |
| `cremma_mss17` – CREMMA Manuscrits du 17e                                                              |    47 | 1600–1699       | CC-BY-4.0                          | https://github.com/HTR-United/CREMMA-MSS-17                                         |
| `cremma_mss18` – CREMMA Manuscrits du 18e                                                              |    41 | 1700–1799       | CC-BY-4.0                          | https://github.com/HTR-United/CREMMA-MSS-18                                         |
| `cremma_mss19` – CREMMA Manuscrits du 19e                                                              |    41 | 1800–1899       | CC-BY-4.0                          | https://github.com/HTR-United/CREMMA-MSS-19                                         |
| `decameron_fr` – DecameronFR                                                                           |     9 | 1430–1455       | CC-BY-4.0                          | https://github.com/PSL-Chartes-HTR-Students/TNAH-2021-DecameronFR                   |
| `denver_jcrs` – University of Denver JCRS HTR Train Set                                                |   111 | 1900–1950       | CC-BY-4.0                          | https://zenodo.org/records/4243023                                                  |
| `dresden_hofdiarium` – Ground Truth Sets: Dresdner Hofdiarium (SLUB)                                   |    38 | 1653–1673       | CC-BY-4.0 / CC-BY-NC-SA-4.0 (K.80) | https://zenodo.org/records/15303398                                                 |
| `enhg_lit463` – Diplomatic HTR GT for an Early New High German manuscript (BayHStA Lit 463, 1480-1485) |    29 | 1480–1485       | CC-BY-4.0                          | https://zenodo.org/records/21257167                                                 |
| `fondue_fr_mss18` – FoNDUE FR MSS 18                                                                   |    41 | 1700–1799       | CC-BY-4.0                          | https://github.com/FoNDUE-HTR/FONDUE-FR-MSS-18                                      |
| `gallicorpora_15e` – Gallicorpora: HTR manuscrits du 15e siècle                                        |    60 | 1400–1500       | CC-BY-4.0                          | https://github.com/Gallicorpora/HTR-MSS-15e-Siecle                                  |
| `htromance_medieval_fr` – HTRomance Medieval French                                                    |    59 | 1200–1499       | CC-BY-4.0                          | https://github.com/HTRomance-Project/medieval-french                                |
| `joseph_hooker` – Joseph Hooker HTR                                                                    |   139 | 1850–1911       | CC-BY-SA-4.0                       | https://github.com/jschaefer738b/JosephHookerHTR                                    |
| `koenigsfelden` – Charters and Records of Königsfelden Abbey and Bailiwick (1308-1662)                 |    91 | 1301–1596       | CC-BY-4.0                          | https://zenodo.org/records/5179361                                                  |
| `lectaurep_bronod` – Notaires de Paris - Bronod                                                        |    12 | 1742–1745       | CC-BY-4.0                          | https://github.com/HTR-United/lectaurep-bronod                                      |
| `lectaurep_mariages` – Notaires de Paris - Mariages et Divorces                                        |    21 | 1829–1928       | CC-BY-4.0                          | https://github.com/HTR-United/lectaurep-mariages-et-divorces                        |
| `mkn_kurrent` – mkn-kurrent-gt: Moravian Knowledge Network Kurrent GT                                  |   125 | 1765–1807       | Public Domain Mark 1.0             | https://github.com/bertsky/mkn-kurrent-gt                                           |
| `poilus_testaments` – CREMMA-AN Testaments de Poilus                                                   |    40 | 1914–1918       | CC-BY-4.0                          | https://github.com/HTR-United/CREMMA-AN-TestamentsDePoilus                          |
| `revolutionary_city` – The Revolutionary City Corpus (1758-1805): HTR Ground Truth                     |   251 | 1758–1805       | CC-BY-4.0                          | https://zenodo.org/records/15776323                                                 |
| `stabs_basel` – HTR GT Set: StABS Ratsbücher O10 / Urfehdenbuch (Basel, 1563-1569)                     |    29 | 1563–1569       | CC-BY-NC-SA-4.0                    | https://zenodo.org/records/5153263                                                  |
| `valais_de` – Recensement Valaisan (Valais Time Machine)                                               |   125 | 1870–1880       | CC-BY-NC 4.0                       | https://github.com/PonteIneptique/valais-recensement                                |
| `valais_fr` – Recensement Valaisan (Valais Time Machine)                                               |    40 | 1870–1880       | CC-BY-NC 4.0                       | https://github.com/PonteIneptique/valais-recensement                                |

## Columns of `metadata.csv`

- `group`: language + period class (`de_pre1700`, …). Period is decided by the midpoint of the date range.
- `not_before` / `not_after`: date range of the page; `date` + `date_precision` (`day`/`year`/`range`) when the source gives an exact date (e.g. Königsfelden charters, Valais census years).
- `doc_id`: source document; train and test never share a `doc_id`.
- `lang_detected` / `lang_margin`: stop-word language check on the transcription (used to drop e.g. Latin pages from German sources and to split the mixed EN/FR Revolutionary City corpus).
- `xml_matches_image`: False when the XML coordinates refer to a different image resolution.

## Licences

Mostly CC-BY / CC-BY-SA; `stabs_basel`, `valais_*` and the Dresden K.80 volume are **non-commercial**. Filter on `source` if you need strictly reusable data. Cite the original datasets (links above).
