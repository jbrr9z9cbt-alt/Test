/*
 * Feste Mannschaften der App.
 *
 * Diese Datei legt der Betreiber fest – in der App selbst können Mannschaften
 * weder angelegt, umbenannt noch gelöscht werden. Nutzer pflegen nur die
 * Turnernamen (Startnummern 1 bis 20) und die Mannschaftsfarbe.
 *
 * Wichtig: Die "id" einer Mannschaft nie ändern, sonst verlieren bereits
 * erfasste Wettkämpfe und Turnernamen die Zuordnung. Name und Standardfarbe
 * dürfen jederzeit geändert werden.
 */
window.TEAM_CONFIG = {
  gymnastsPerTeam: 20,
  teams: [
    { id: 'T1', name: 'Mannschaft 1', color: '#c0392b' },
    { id: 'T2', name: 'Mannschaft 2', color: '#2471a3' },
    { id: 'T3', name: 'Mannschaft 3', color: '#1e8449' },
    { id: 'T4', name: 'Mannschaft 4', color: '#d68910' },
    { id: 'T5', name: 'Mannschaft 5', color: '#7d3c98' },
    { id: 'T6', name: 'Mannschaft 6', color: '#117a65' },
    { id: 'T7', name: 'Mannschaft 7', color: '#a04000' }
  ]
};
