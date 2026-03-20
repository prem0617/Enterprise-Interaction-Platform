import mongoose from "mongoose";

/** Collect unique string ids that are valid 24-char ObjectIds (avoids populate $in cast errors). */
export function validOidStrings(ids) {
  const out = new Set();
  for (const id of ids) {
    if (id == null) continue;
    const s = typeof id === "string" ? id : id.toString?.();
    if (s && mongoose.isValidObjectId(s)) out.add(s);
  }
  return [...out];
}

/** Load documents by _id into a Map keyed by id string. Skips invalid ids so $in never throws. */
export async function fetchMapByIds(Model, ids, select) {
  const keys = validOidStrings(ids);
  if (keys.length === 0) return new Map();
  const docs = await Model.find({ _id: { $in: keys } }).select(select).lean();
  return new Map(docs.map((d) => [d._id.toString(), d]));
}
