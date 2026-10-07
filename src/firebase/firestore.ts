import { supabase } from '../services/supabase.js';

let firestoreClient: any = supabase;
export const configureFirestoreClient = (client: any) => {
  firestoreClient = client;
};

export const getFirestore = (_app?: any, _dbId?: string) => ({ name: 'supabase-firestore', dbId: _dbId || null });
export const initializeFirestore = (_app?: any, _dbId?: string) => getFirestore(_app, _dbId);
export const db = getFirestore();

const joinPath = (...segments: Array<string | number | null | undefined>) =>
  segments.filter((segment) => segment !== undefined && segment !== null && segment !== '').join('/');

export const doc = (dbRef: any, ...pathSegments: Array<string | number | null | undefined>) => {
  const collectionName = joinPath(...pathSegments.slice(0, -1));
  const documentId = pathSegments[pathSegments.length - 1];

  return {
    collection: collectionName,
    id: documentId,
    path: joinPath(collectionName, documentId),
    type: 'doc',
    db: dbRef,
  };
};

export const collection = (dbRef: any, ...pathSegments: Array<string | number | null | undefined>) => {
  const path = joinPath(...pathSegments);
  return {
    collection: path,
    id: null,
    type: 'collection',
    db: dbRef,
    filters: [],
    orderBy: [],
  };
};

export const where = (field: string, op: string, value: any) => ({
  type: 'where',
  field,
  op,
  value,
});

export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => ({
  type: 'orderBy',
  field,
  direction,
});

export const query = (ref: any, ...constraints: any[]) => {
  const nextRef = {
    ...ref,
    filters: [...(ref?.filters || [])],
    orderBy: [...(ref?.orderBy || [])],
    limit: ref?.limit,
  };

  for (const constraint of constraints) {
    if (!constraint) {
      continue;
    }

    if (constraint.type === 'where') {
      nextRef.filters.push(constraint);
    }

    if (constraint.type === 'orderBy') {
      nextRef.orderBy.push(constraint);
    }

    if (constraint.type === 'limit') {
      nextRef.limit = constraint;
    }
  }

  return nextRef;
};

export const limit = (fieldOrValue: string | number, value?: number) => ({
  type: 'limit',
  field: typeof fieldOrValue === 'string' ? fieldOrValue : undefined,
  value: typeof fieldOrValue === 'number' ? fieldOrValue : value,
});

export const increment = (value: number) => ({
  __increment__: value,
});

export const arrayUnion = (...values: any[]) => ({
  __arrayUnion__: values.flat(),
});

const getField = (item: any, field: string) => field.split('.').reduce((value, key) => value?.[key], item);

const matchesFilter = (item: any, filter: any) => {
  const actual = getField(item, filter.field);
  const expected = filter.value;
  switch (filter.op) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case 'array-contains': return Array.isArray(actual) && actual.includes(expected);
    case 'in': return (Array.isArray(expected) ? expected : [expected]).includes(actual);
    default: return true;
  }
};

const compareValues = (left: any, right: any) => {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
};

const parseData = (row: any) => ({
  ...(row?.data || {}),
  id: row?.id ?? row?.data?.id ?? null,
});

class FirestoreSnapshot {
  public docs: any[];
  public empty: boolean;
  public readonly ref: any;
  private changes: any[];

  constructor(public readonly dataItems: any[], public readonly collectionRef: any, previousItems: any[] = []) {
    const previousById = new Map(previousItems.map((item) => [item.id, item]));
    const currentIds = new Set(dataItems.map((item) => item.id));
    this.docs = dataItems.map((item) => ({
      id: item.id,
      ref: { ...collectionRef, id: item.id },
      data: () => item,
      exists: () => true,
    }));
    this.empty = dataItems.length === 0;
    this.ref = collectionRef;
    this.changes = dataItems.flatMap((item) => {
      const previous = previousById.get(item.id);
      if (!previous) return [{ type: 'added', doc: this.docs.find((entry) => entry.id === item.id) }];
      return JSON.stringify(previous) === JSON.stringify(item)
        ? []
        : [{ type: 'modified', doc: this.docs.find((entry) => entry.id === item.id) }];
    });
    for (const previous of previousItems) {
      if (!currentIds.has(previous.id)) {
        this.changes.push({ type: 'removed', doc: { id: previous.id, data: () => previous } });
      }
    }
  }

  forEach(callback: (doc: any) => void) {
    this.docs.forEach((doc) => callback(doc));
  }

  docChanges() {
    return this.changes;
  }
}

export const getDocs = async (ref: any) => {
  const targetRef = ref?.collection ? ref : collection(ref, ref?.tableName || 'items');
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await firestoreClient
      .from('app_documents')
      .select('id,data')
      .eq('collection', targetRef.collection)
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  let normalized = rows.map(parseData);
  normalized = normalized.filter((item) => (targetRef.filters || []).every((filter: any) => matchesFilter(item, filter)));
  for (const orderItem of targetRef.orderBy || []) {
    normalized.sort((left, right) => compareValues(getField(left, orderItem.field), getField(right, orderItem.field)) * (orderItem.direction === 'desc' ? -1 : 1));
  }
  if (targetRef.limit?.value != null) normalized = normalized.slice(0, targetRef.limit.value);
  return new FirestoreSnapshot(normalized, targetRef);
};

export const getDoc = async (ref: any) => {
  if (!ref?.collection) {
    return { exists: () => false, data: () => ({}) };
  }

  const identifier = ref.id;
  const { data, error } = identifier
    ? await firestoreClient.from('app_documents').select('id,data').eq('collection', ref.collection).eq('id', identifier).maybeSingle()
    : await firestoreClient.from('app_documents').select('id,data').eq('collection', ref.collection).maybeSingle();

  if (error) {
    throw error;
  }

  const docData = data ? parseData(data) : null;
  return {
    exists: () => Boolean(docData),
    data: () => docData || {},
    id: identifier || docData?.id || null,
    ref,
    empty: !docData,
  };
};

export const setDoc = async (ref: any, data: any, options?: { merge?: boolean }) => {
  const id = String(data?.id ?? ref?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const existingData = options?.merge
    ? await getDoc({ ...ref, id }).then((snap) => (snap.exists() ? snap.data() : null)).catch(() => null)
    : null;
  const nextData = { ...(existingData || {}), ...data, id };
  for (const [key, value] of Object.entries(nextData)) {
    if (value && typeof value === 'object' && '__arrayUnion__' in value) {
      const existingArr = Array.isArray(existingData?.[key]) ? existingData[key] : [];
      nextData[key] = [...new Set([...existingArr, ...(value as any).__arrayUnion__])];
    } else if (value && typeof value === 'object' && '__increment__' in value) {
      nextData[key] = Number(existingData?.[key] || 0) + Number((value as any).__increment__);
    }
  }

  const { data: result, error } = await firestoreClient.from('app_documents').upsert({
    collection: ref.collection,
    id,
    data: nextData,
  }, { onConflict: 'collection,id' }).select('id,data').single();

  if (error) {
    throw error;
  }

  return parseData(result);
};

export const updateDoc = async (ref: any, data: any) => {
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error(`Document not found: ${ref.collection}/${ref.id}`);
  await setDoc(ref, { ...existing.data(), ...data, id: ref.id }, { merge: true });
};

export const addDoc = async (ref: any, data: any) => {
  const id = String(data?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const { data: result, error } = await firestoreClient.from('app_documents').insert({
    collection: ref.collection,
    id,
    data: { ...data, id },
  }).select('id,data').single();
  if (error) {
    throw error;
  }
  return { id: result?.id, ref: { ...ref, id: result?.id }, ...parseData(result) };
};

export const deleteDoc = async (ref: any) => {
  const { error } = await firestoreClient.from('app_documents').delete().eq('collection', ref.collection).eq('id', ref.id);
  if (error) {
    throw error;
  }
};

export const onSnapshot = (refOrQuery: any, callback: (snap: any) => void, errorCallback?: (error: any) => void) => {
  const tableName = 'app_documents';
  const collectionName = refOrQuery?.collection || refOrQuery?.tableName || 'items';
  let previousItems: any[] = [];

  const run = async () => {
    try {
      const queryRef = refOrQuery?.collection ? refOrQuery : collection(db, collectionName);
      const snap = await getDocs(queryRef);
      callback(new FirestoreSnapshot(snap.dataItems, queryRef, previousItems));
      previousItems = snap.dataItems;
    } catch (error) {
      console.warn('Supabase onSnapshot fallback error:', error);
      errorCallback?.(error);
    }
  };

  run();

  if (!tableName) {
    return () => {};
  }

  try {
    const channel = firestoreClient.channel(`snapshot:${tableName}:${Math.random().toString(36).slice(2)}`);
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      filter: `collection=eq.${collectionName}`,
    }, () => {
      run();
    });
    channel.subscribe();
    return () => {
      firestoreClient.removeChannel(channel);
    };
  } catch (error) {
    console.warn('Realtime subscription unavailable, using polling fallback:', error);
    errorCallback?.(error);
    const interval = setInterval(() => run(), 30000);
    return () => clearInterval(interval);
  }
};

export const serverTimestamp = () => new Date().toISOString();
