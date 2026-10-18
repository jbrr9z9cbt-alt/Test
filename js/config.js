/*
 * Feste Mannschaften der App.
 *
 * Diese Datei legt der Betreiber fest – in der App selbst können Mannschaften
 * weder angelegt, umbenannt noch gelöscht werden. Nutzer pflegen nur die
 * Turnernamen (Startnummern 1 bis 20). Die Mannschaftsfarbe wird je Wettkampf
 * beim Anlegen gewählt.
 *
 * Wichtig: Die "id" einer Mannschaft nie ändern, sonst verlieren bereits
 * erfasste Wettkämpfe und Turnernamen die Zuordnung. Der Name darf jederzeit
 * geändert werden.
 */
window.TEAM_CONFIG = {
  gymnastsPerTeam: 20,
  teams: [
    { id: 'T1', name: 'Mannschaft 1' },
    { id: 'T2', name: 'Mannschaft 2' },
    { id: 'T3', name: 'Mannschaft 3' },
    { id: 'T4', name: 'Mannschaft 4' },
    { id: 'T5', name: 'Mannschaft 5' },
    { id: 'T6', name: 'Mannschaft 6' },
    { id: 'T7', name: 'Mannschaft 7' }
  ]
};
