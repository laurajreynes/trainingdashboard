/**
 * Starting numbers for the Phones tab, as pulled from Car Wars on Nov 8, 2026. A posted pull (see /api/phones)
 * replaces these account by account. One block per month and account:
 *   first line   month account from to pulled | total io,ir,fi,oc,ol,os
 *   then         name|Car Wars groups joined with +|io|ir|fi|oc|ol|os
 * io = inbound sales calls, ir = appointment requests, fi = firm appointments set,
 * oc = outbound calls, ol = outbound live conversations, os = outbound appointments set.
 */
export const PHONES_SEED = `
2026-11 cct 2026-11-01 2026-11-08 2026-11-09T03:24:49.619Z | 111,60,18,544,196,28
Baxter Robbins|Toyota|12|7|1|42|12|2
Alan Stradiotto|Belgrade|9|7|3|16|7|0
Kaden Haffner|Chevrolet|6|3|1|17|8|1
Garrett Hanson|Toyota|5|2|1|47|22|3
Jayson Howard|Toyota|5|2|1|20|10|0
Shane Deavours|BDC (default)|4|2|0|0|0|0
Arazan Alberino|Toyota|4|1|1|30|14|1
Keegan Brady|Toyota|3|3|0|12|5|1
Genius User Ressler Motor||3|2|0|0|0|0
Sammy Tyrpak|Toyota|3|1|1|27|13|1
Preston Knight|Toyota|3|1|1|14|7|0
Sam Kupersmith|Toyota|3|1|0|15|5|1
Justin Henzi|BDC (default)|3|1|0|24|7|2
Rob Burns|Chevrolet|3|0|0|16|5|1
Evan Bangert|Chevrolet|2|2|1|21|6|0
Eli Singleton|Chevrolet|2|1|1|7|3|1
Casey St. Clair|Belgrade|2|1|0|17|6|1
Liam Scott|Toyota|2|1|0|10|3|2
Wyatt Kubiak|BDC (default)|2|1|0|0|0|0
Lou Saucedo|Chevrolet|1|1|1|2|1|0
Eduardo Delgado|Chevrolet|1|1|0|9|0|0
Madelyn Nowak|Chevrolet|1|0|0|15|7|0
Maddi Hart|BDC (default)|1|0|0|31|4|4
Tiffany Villasenor|Toyota|1|0|0|3|2|1
Kai Taresh|Chevrolet|1|0|0|19|7|2
Micah Andresen|New Car Sales (default)|0|0|0|13|2|1
Laura Reynes||0|0|0|1|0|0
Trevor Cass|Toyota|0|0|0|2|0|0
Tyler Howland|Toyota|0|0|0|7|2|0
Jess Rinehart|Toyota|0|0|0|11|5|1
Geran Williamson|Toyota|0|0|0|23|10|0
Brooks Tarbell|Toyota|0|0|0|26|7|0
Christian Torres|Toyota|0|0|0|13|4|1
Colton Wilson|Toyota|0|0|0|2|1|0
Shane Briese|Belgrade|0|0|0|4|1|0
Eve Johnson|Chevrolet|0|0|0|3|1|1
Parker Dyksterhouse|Danhof|0|0|0|8|2|0
Owen Shields|Chevrolet|0|0|0|14|7|0
Unclaimed||29|19|5|3|0|0

2026-11 subaru 2026-11-01 2026-11-08 2026-11-09T03:26:10.000Z | 29,20,8,679,123,21
Mia Leandro||6|3|2|42|6|0
Allison Bergen||4|3|2|85|16|2
Mason Buck||3|3|1|53|11|2
Dimitrios Imbrunetti||3|3|1|48|8|1
Chris Froelich|BDC (default)|3|3|1|40|9|5
Abie Benson||2|1|0|74|5|0
Zachary Novak||2|1|0|25|8|2
Ryan Ghormley||2|0|0|46|9|1
Ian Deroeck||1|1|1|56|17|0
Ethan Kilgore||1|1|0|77|16|3
Genius User DO NOT DELETE|BDC (default)|1|1|0|0|0|0
Laura Reynes||0|0|0|5|1|0
Catherine Long||0|0|0|75|4|2
Zach Tate|New Car Sales (default)|0|0|0|13|4|1
Halie Monroe||0|0|0|14|7|1
Ryan Crum||0|0|0|26|2|1
Unclaimed||1|0|0|0|0|0

2026-10 cct 2026-10-01 2026-10-31 2026-11-09T03:24:50.855Z | 133,75,19,349,110,21
Justin Henzi|BDC (default)|11|4|1|37|12|7
Alan Stradiotto|Belgrade|6|4|1|28|8|1
Shane Deavours|BDC (default)|6|0|0|5|4|1
Kaden Haffner|Chevrolet|5|4|2|6|3|0
Casey St. Clair|Belgrade|5|3|0|17|3|1
Erik McNeely|Belgrade|4|2|1|3|0|0
Genius User Ressler Motor||4|1|1|0|0|0
Wyatt Kubiak|BDC (default)|3|3|2|4|2|1
Daniela Zastavinetcaia|Chevrolet|2|2|1|3|1|0
Eve Johnson|Chevrolet|2|2|1|1|0|0
Evan Bangert|Chevrolet|2|2|0|31|8|0
Owen Shields|Chevrolet|2|2|0|7|1|0
Maddi Hart|BDC (default)|2|2|0|34|3|1
Parker Dyksterhouse|Danhof|2|1|0|15|3|0
Shane Briese|Belgrade|2|1|0|17|6|1
Lou Saucedo|Chevrolet|1|1|0|1|0|0
Hattie Dursteler|BDC (default)|1|1|0|2|1|0
Baxter Robbins|Toyota|1|1|0|7|4|0
Kai Taresh|Chevrolet|1|1|0|0|0|0
Russ Stump||1|0|0|0|0|0
Eli Singleton|Chevrolet|1|0|0|12|5|1
Eduardo Delgado|Chevrolet|0|0|0|8|2|1
Arazan Alberino|Toyota|0|0|0|2|0|0
Brooks Tarbell|Toyota|0|0|0|3|2|0
Christian Torres|Toyota|0|0|0|5|1|0
Colton Wilson|Toyota|0|0|0|3|1|0
Devon Chung|Toyota|0|0|0|1|0|0
Garrett Hanson|Toyota|0|0|0|18|8|2
Jayson Howard|Toyota|0|0|0|23|8|1
Jess Rinehart|Toyota|0|0|0|6|5|2
Keegan Brady|Toyota|0|0|0|5|0|0
Liam Scott|Toyota|0|0|0|4|1|0
Sammy Tyrpak|Toyota|0|0|0|7|2|0
Tiffany Villasenor|Toyota|0|0|0|1|0|0
Trevor Cass|Toyota|0|0|0|1|1|0
Tyler Howland|Toyota|0|0|0|9|2|0
Rob Burns|Chevrolet|0|0|0|3|0|0
TJ Fields|Chevrolet|0|0|0|1|0|0
Laura Reynes||0|0|0|14|4|1
Kim Diaz|Car Wars Service (default)+Toyota Service|0|0|0|0|2|0
Jeremy Ricks|Car Wars Service (default)+Toyota Service|0|0|0|0|3|0
Madisen Whirley|Car Wars Service (default)+Toyota Service|0|0|0|0|2|0
Jace Sheehan|Car Wars Service (default)+Toyota Service|0|0|0|0|2|0
Unclaimed||69|38|9|5|0|0

2026-10 subaru 2026-10-01 2026-10-31 2026-11-09T03:26:11.000Z | 93,61,21,1512,295,35
Allison Bergen||14|5|1|160|40|5
Ryan Ghormley||8|7|3|78|14|1
Mason Buck||8|6|1|160|27|4
Mia Leandro||7|6|2|120|26|4
Ian Deroeck||7|4|2|76|21|7
Chris Froelich|BDC (default)|6|6|2|14|3|2
Zachary Novak||6|5|2|100|30|2
Dimitrios Imbrunetti||5|3|1|195|27|2
Ryan Crum||5|3|0|41|6|2
Ethan Kilgore||3|3|2|222|34|1
Abie Benson||3|2|1|75|9|0
Catherine Long||3|0|0|224|52|3
Genius User DO NOT DELETE|BDC (default)|2|0|0|0|0|0
Erik Damon|New Car Sales (default)|1|1|1|0|0|0
Laura Reynes||0|0|0|19|2|1
Zach Tate|New Car Sales (default)|0|0|0|8|1|0
Halie Monroe||0|0|0|18|3|1
Sean Skelton||0|0|0|1|0|0
Unclaimed||15|10|3|1|0|0
`;
