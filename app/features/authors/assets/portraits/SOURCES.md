# Author portraits

Portraits shown on `/authors/<slug>/`, stored locally so the site does not
depend on a third-party image host at runtime. Each is cropped to 4:5 so the
pages share one shape, and the site drains the colour out of it and recolors it
with the Ambedkar blue palette.

`app/features/authors/portraits.ts` names the file, the alternative text, and
the credit each one is shown with. Two of the portraits it lists are not here:
B. R. Ambedkar and Malcolm X are already in `app/assets/shared/leaders/` and are
imported from there rather than committed twice.

- `periyar-e-v-ramasamy.jpg`: E. V. Ramasamy, from the Tamil monthly _Lakshmi_,
  Madras, October 1924, public domain. Cropped to the figure.
  [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Erode_Venkatappa_Ramasamy.jpg)
- `bell-hooks.jpg`: bell hooks in October 2014, photographed by Alex Lozupone
  (Tduk), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Cropped.
  [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Bell_hooks,_October_2014.jpg)
- `gail-omvedt.jpg`: Gail Omvedt, photographed by Krantivir2014,
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Cropped to
  the figure.
  [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Gail_Omvedt.JPG)
- `kancha-ilaiah.jpg`: Kancha Ilaiah Shepherd at the Kerala Literature
  Festival, photographed by Sreejithkoiloth,
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Cropped to
  the figure.
  [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Kancha_Ilaiah.jpg)

An author with no freely licensed portrait shows none. A photograph AKSC owns
is added through the author entry's own `portrait` field instead, which takes
precedence over anything listed here.
