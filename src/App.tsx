import React, { useEffect, useMemo, useState } from "react";

const MENU_STORAGE_KEY = "training-menus";
const RECORD_STORAGE_KEY = "training-records";

const DEFAULT_MENUS = ["ベンチプレス", "スクワット", "デッドリフト"];

type RecordItem = {
  id: string;
  date: string;
  menu: string;
  weight: number;
  reps: number;
  createdAt: number;
};

type ExportData = {
  menus: string[];
  records: RecordItem[];
};

const createId = () => crypto.randomUUID();

const todayISO = () => new Date().toISOString().slice(0, 10);

const sortRecords = (records: RecordItem[]) =>
  [...records].sort((a, b) => {
    if (a.date === b.date) {
      return b.createdAt - a.createdAt;
    }
    return b.date.localeCompare(a.date);
  });

const safeParseJSON = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const readMenus = (): string[] => {
  const raw = localStorage.getItem(MENU_STORAGE_KEY);
  if (!raw) return DEFAULT_MENUS;
  const parsed = safeParseJSON<unknown>(raw);
  if (Array.isArray(parsed)) {
    const cleaned = parsed
      .filter((m) => typeof m === "string")
      .map((m) => m.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : DEFAULT_MENUS;
  }
  return DEFAULT_MENUS;
};

const readRecords = (): RecordItem[] => {
  const raw = localStorage.getItem(RECORD_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJSON<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  // できるだけ壊れてても救う
  const cleaned = parsed
    .filter((r) => r && typeof r === "object")
    .map((r: any) => {
      const date = typeof r.date === "string" ? r.date : "";
      const menu = typeof r.menu === "string" ? r.menu : "";
      const weight = Number(r.weight);
      const reps = Number(r.reps);
      const createdAt = typeof r.createdAt === "number" ? r.createdAt : Date.now();
      const id = typeof r.id === "string" ? r.id : createId();

      return {
        id,
        date,
        menu,
        weight: Number.isFinite(weight) ? weight : 0,
        reps: Number.isFinite(reps) ? reps : 0,
        createdAt,
      } satisfies RecordItem;
    })
    .filter((r) => r.date && r.menu && r.weight > 0 && r.reps > 0);

  return cleaned;
};

const normalizeImport = (data: ExportData) => {
  const menusRaw = Array.isArray(data.menus) ? data.menus : [];
  const nextMenus = menusRaw
    .filter((m) => typeof m === "string")
    .map((m) => m.trim())
    .filter(Boolean);

  const finalMenus = nextMenus.length > 0 ? nextMenus : DEFAULT_MENUS;

  const recordsRaw = Array.isArray(data.records) ? data.records : [];
  const nextRecords = recordsRaw
    .filter((r) => r && typeof r === "object")
    .map((r: any) => {
      const date = typeof r.date === "string" ? r.date : "";
      const menu = typeof r.menu === "string" ? r.menu : finalMenus[0] ?? "";
      const weight = Number(r.weight);
      const reps = Number(r.reps);
      const createdAt = typeof r.createdAt === "number" ? r.createdAt : Date.now();
      const id = typeof r.id === "string" ? r.id : createId();

      return {
        id,
        date,
        menu,
        weight: Number.isFinite(weight) ? weight : 0,
        reps: Number.isFinite(reps) ? reps : 0,
        createdAt,
      } satisfies RecordItem;
    })
    .filter((r) => r.date && r.menu && r.weight > 0 && r.reps > 0);

  return { finalMenus, nextRecords };
};

export default function App() {
  // ★ 初期値を localStorage から直接読む（初期化useEffect不要）
  const [menus, setMenus] = useState<string[]>(readMenus);
  const [records, setRecords] = useState<RecordItem[]>(readRecords);

  const [menuInput, setMenuInput] = useState("");
  const [date, setDate] = useState(todayISO);
  const [menu, setMenu] = useState(() => readMenus()[0] ?? "");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // ★ menus 変更時に保存（空のときは保存しない）
  useEffect(() => {
    if (menus.length > 0) {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menus));
    }
    // 選択中メニューが消えたら先頭へ
    if (menus.length > 0 && !menus.includes(menu)) {
      setMenu(menus[0]);
    }
  }, [menus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★ records 変更時に保存
  useEffect(() => {
    localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const sortedRecords = useMemo(() => sortRecords(records), [records]);

  const handleAddMenu = () => {
    const trimmed = menuInput.trim();
    if (!trimmed) {
      setErrors(["メニュー名を入力してください。"]);
      return;
    }
    if (menus.includes(trimmed)) {
      setErrors(["同じメニューが既に登録されています。"]);
      return;
    }
    const nextMenus = [...menus, trimmed];
    setMenus(nextMenus);
    setMenu(trimmed);
    setMenuInput("");
    setErrors([]);
  };

  const handleDeleteMenu = (target: string) => {
    const nextMenus = menus.filter((item) => item !== target);
    const finalMenus = nextMenus.length > 0 ? nextMenus : DEFAULT_MENUS;

    setMenus(finalMenus);

    // 選択中が消えたら先頭へ
    if (!finalMenus.includes(menu)) {
      setMenu(finalMenus[0] ?? "");
    }
  };

  const validateRecord = () => {
    const nextErrors: string[] = [];
    if (!date) nextErrors.push("日付は必須です。");
    if (!menu) nextErrors.push("メニューを選択してください。");

    const weightValue = Number(weight);
    if (!weight || Number.isNaN(weightValue) || weightValue <= 0) {
      nextErrors.push("重量は0より大きい数を入力してください。");
    }

    const repsValue = Number(reps);
    if (!reps || Number.isNaN(repsValue) || repsValue <= 0) {
      nextErrors.push("回数は0より大きい数を入力してください。");
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleAddRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateRecord()) return;

    const newRecord: RecordItem = {
      id: createId(),
      date,
      menu,
      weight: Number(weight),
      reps: Number(reps),
      createdAt: Date.now(),
    };

    // ★ 新しいのを先頭に
    setRecords((prev) => [newRecord, ...prev]);

    // ★ 次の入力が楽になるように：重量/回数だけクリア、日付/メニューは残す
    setWeight("");
    setReps("");
    setErrors([]);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExport = () => {
    const data: ExportData = { menus, records };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `training-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ExportData;
        if (!parsed || typeof parsed !== "object") {
          setImportError("不正なJSON形式です。");
          return;
        }

        // ★ バリデーションしつつ復元
        const { finalMenus, nextRecords } = normalizeImport(parsed);

        setMenus(finalMenus);
        setMenu(finalMenus[0] ?? "");
        setRecords(nextRecords);

        setImportError(null);
        setErrors([]);
      } catch {
        setImportError("JSONの読み込みに失敗しました。");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>筋トレ記録</h1>
          <p>ローカル保存で気軽にトレーニングを記録できます。</p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={handleExport}>
            JSONエクスポート
          </button>
          <label className="import-button">
            JSONインポート
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </header>

      {importError && <p className="error">{importError}</p>}

      <section className="card">
        <div className="section-header">
          <h2>1) メニュー管理</h2>
        </div>
        <div className="menu-form">
          <input
            type="text"
            placeholder="新しいメニュー名"
            value={menuInput}
            onChange={(event) => setMenuInput(event.target.value)}
          />
          <button type="button" onClick={handleAddMenu}>
            追加
          </button>
        </div>
        <ul className="menu-list">
          {menus.length === 0 && <li className="empty">メニューがありません。</li>}
          {menus.map((item) => (
            <li key={item}>
              <span>{item}</span>
              <button type="button" onClick={() => handleDeleteMenu(item)}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>2) トレーニング記録</h2>
        </div>
        <form className="record-form" onSubmit={handleAddRecord}>
          <label>
            日付
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            メニュー
            <select value={menu} onChange={(event) => setMenu(event.target.value)}>
              <option value="">選択してください</option>
              {menus.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            重量 (kg)
            <input
              type="number"
              min="0"
              step="0.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="例: 60"
            />
          </label>
          <label>
            回数 (reps)
            <input
              type="number"
              min="0"
              step="1"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              placeholder="例: 8"
            />
          </label>
          <button type="submit">追加</button>
        </form>

        {errors.length > 0 && (
          <ul className="error-list">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>3) 記録一覧</h2>
          <span className="count">合計 {records.length} 件</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>メニュー</th>
                <th>重量 (kg)</th>
                <th>回数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    まだ記録がありません。
                  </td>
                </tr>
              )}
              {sortedRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.menu}</td>
                  <td>{record.weight}</td>
                  <td>{record.reps}</td>
                  <td>
                    <button type="button" onClick={() => handleDeleteRecord(record.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
