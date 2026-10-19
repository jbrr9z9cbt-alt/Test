/*
 * Liga, feste Mannschaften und vorgegebene Turner (Startnummern 1–20).
 *
 * Diese Datei legt der Betreiber fest – in der App können Mannschaften weder
 * angelegt, umbenannt noch gelöscht werden. Der Wettkampfausrichter kann
 * Turnernamen korrigieren und freie Startnummern belegen.
 *
 * rosterVersion: Bei jeder Änderung der Turnerlisten hier erhöhen. Nach dem
 * Update setzt die App die Turnernamen auf diesen Stand zurück (eigene
 * Änderungen der Nutzer werden dann überschrieben). Bereits erfasste
 * Wettkämpfe bleiben unverändert, weil sie die Namen selbst speichern.
 *
 * Wichtig: Die "id" einer Mannschaft nie ändern, sonst verlieren bereits
 * erfasste Wettkämpfe die Zuordnung. Der Name darf jederzeit geändert werden.
 */
window.TEAM_CONFIG = {
  league: 'WTB-Oberliga',
  gymnastsPerTeam: 20,
  rosterVersion: 1,
  teams: [
    {
      id: 'T1', name: 'KTS Mettingen',
      gymnasts: {
        1: 'Baar, Matz', 2: 'Brickwedde, Henning', 3: 'Stork, Elias', 4: 'Köhne, Tobias', 5: 'Meck, Bodo',
        6: 'Muck, Thure', 7: 'Weddehoff, Johann', 8: 'Dirkmann, Marlin', 9: 'von Wulfen, Philipp',
        10: 'von Wulfen, Stephan', 11: 'von Wulfen, Theo', 12: 'Langemeyer, Daniel', 13: 'Meck, Anton',
        15: 'Luck, Joshua', 16: 'Luck, Jonah', 17: 'Rohlmann, Marten', 18: 'Wagner, Jonas', 20: 'Reissfelder, Robert'
      }
    },
    {
      id: 'T2', name: 'TSV Kierspe 1',
      gymnasts: {
        1: 'Berg, Steffen', 2: 'Schmitter, Tim', 3: 'Brandts, Konrad', 5: 'Gundermann, Elias', 6: 'Langwald, Tobias',
        7: 'Meisel, Kevin Meik', 8: 'Scholz, Sam', 9: 'Ortolano, Marlon', 13: 'Ulbrich, Julian',
        14: 'Fischer, Alexander', 15: 'Pempe, Konrad', 16: 'Siegmund, Leon', 17: 'Schacht, Flynn'
      }
    },
    {
      id: 'T3', name: 'TZ Bochum-Witten',
      gymnasts: {
        1: 'Dörrsam, Julius', 2: 'Albuschat, Moritz', 3: 'Shilov, Miron', 4: 'Hagmann, Jan', 5: 'Boros, Bercel',
        6: 'Boros, Csanad', 7: 'Poerschke, Jona', 8: 'Mielke, Mats', 9: 'Reichert, Dominik', 10: 'Sandner, Jona',
        11: 'Schiller, Louis', 12: 'Alfermann, Michael', 13: 'Tisetzki, Roman', 14: 'Moscato, Alessandro'
      }
    },
    {
      id: 'T4', name: 'SG Paderborn',
      gymnasts: {
        1: 'Scholz, Oscar', 2: 'Pott, Felix', 3: 'Kirchhoff, Thomas', 4: 'Brüggemann, Moritz', 5: 'Jörgens, Marcel',
        6: 'Peters, Alejandro', 7: 'Josephs, Christian', 8: 'Köppen, Leandro', 9: 'Lemperle, Marc', 10: 'Renger, Tim',
        11: 'Reller, Sebastian', 12: 'Pieper, Thore', 13: 'Dmitrovic, Luka', 14: 'Genc, Jakob', 15: 'Geis, Markus'
      }
    },
    {
      id: 'T5', name: 'SG Langenei-Kickenbach/Gleidorf',
      gymnasts: {
        1: 'Krämer, Bastian', 2: 'Kaiser, Daniel', 4: 'Wüllner, Jannik', 5: 'Rosenkranz, Ricardo', 6: 'Eckstein, Mattis',
        7: 'Gertner, Jan', 8: 'Daudrich, Michael', 10: 'Wolf, Moritz', 11: 'Wilmes, Jakob', 12: 'Krämer, Mats',
        13: 'Gehle, Anton', 14: 'Wilmes, Jonathan', 15: 'Boike, Eric'
      }
    },
    {
      id: 'T6', name: 'TG Geisweid/Eichen',
      gymnasts: {
        1: 'Daudrich, Michael', 2: 'Krämer, Mats', 3: 'Krämer, Fiete', 4: 'Daudrich, Leonard', 5: 'Kupferoth, Pontus',
        6: 'Formitschow, Julian', 7: 'Funk, Milian', 8: 'Jacob, Theo', 9: 'Klein, Tobias', 10: 'Lenders, Noah',
        11: 'Römer, Markus', 12: 'Valido, Fabio'
      }
    },
    {
      id: 'T7', name: 'KTV Dortmund',
      gymnasts: {
        1: 'Hellmich, Thomas', 2: 'Gangnus, Caspar', 3: 'Lell, Matthias', 4: 'König, Stefan', 5: 'Blaurock, Nick',
        6: 'Luig, Simon', 7: 'Schmitz, Robin', 8: 'Mönnig, Jan', 9: 'Schall, Alexander', 10: 'Schwab, Pan',
        11: 'Olenberg, Daniel', 12: 'Olenberg, Marcel', 14: 'Brand, Cedrik', 15: 'Byrski, David',
        16: 'Gronbach, Lucas', 17: 'Hülsmann, Peer', 18: 'König, Koray'
      }
    }
  ]
};
