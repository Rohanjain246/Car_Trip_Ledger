// Paste the Web app URL from Apps Script (Deploy > New deployment > Web app)
export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx55e3qE5KaG-5nqVjp9KfyQV7WUSftuyA4LRXcOSQ_iH2tSkcwWnmqKIPN3HDUPRnU/exec"
export async function loadSheet() {
  const res = await fetch(SCRIPT_URL);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Could not load entries");
  // title = row 1, headings = row 2, entries = [{ date, day, trips:[{amount,paid}], cng:[...] }]
  return { title: data.title, headings: data.headings, entries: data.entries };
}

export async function saveEntry(entry) {
  await postEntry({ ...entry, action: "create" });
}

export async function updateEntry(entry) {
  await postEntry({ ...entry, action: "update" });
}

async function postEntry(entry) {
  // no-cors: the browser can't read the reply, so success means "sent"
  await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(entry),
  });
}