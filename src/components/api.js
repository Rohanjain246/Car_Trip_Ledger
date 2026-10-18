function getScriptUrl() {
  const url = import.meta.env.VITE_SCRIPT_URL;
  if (!url) {
    throw new Error("VITE_SCRIPT_URL is missing. Set it in your .env.local file.");
  }
  return url;
}

export async function loadSheet() {
  const res = await fetch(getScriptUrl());
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
  await fetch(getScriptUrl(), {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(entry),
  });
}