import { useEffect, useMemo, useState } from "react";

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

const sortRecords = (records: RecordItem[]) =>
  [...records].sort((a, b) => {
    if (a.date === b.date) {
      return b.createdAt - a.createdAt;
    }
    return b.date.localeCompare(a.date);
  });

const readMenus = () => {
  const raw = localStorage.getItem(MENU_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_MENUS;
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return DEFAULT_MENUS;
  }
  return DEFAULT_MENUS;
};

const readRecords = () => {
  const raw = localStorage.getItem(RECORD_STORAGE_KEY);
  if (!raw) {
    return [] as RecordItem[];
  }
  try {
    const parsed = JSON.parse(raw) as RecordItem[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return [] as RecordItem[];
  }
  return [] as RecordItem[];
};

export default function App() {
  const [menus, setMenus] = useState<string[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [menuInput, setMenuInput] = useState("");
  const [date, setDate] = useState("");
  const [menu, setMenu] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const storedMenus = readMenus();
    setMenus(storedMenus);
    setMenu(storedMenus[0] ?? "");
    setRecords(readRecords());
  }, []);

  useEffect(() => {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menus));
  }, [menus]);

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
    setMenus(nextMenus);
    if (menu === target) {
      setMenu(nextMenus[0] ?? "");
    }
  };

  const validateRecord = () => {
    const nextErrors: string[] = [];
    if (!date) {
      nextErrors.push("日付は必須です。");
    }
    if (!menu) {
      nextErrors.push("メニューを選択してください。");
    }
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
    if (!validateRecord()) {
      return;
    }
    const newRecord: RecordItem = {
      id: createId(),
      date,
      menu,
      weight: Number(weight),
      reps: Number(reps),
      createdAt: Date.now(),
    };
    setRecords((prev) => [...prev, newRecord]);
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
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ExportData;
        if (!Array.isArray(parsed.menus) || !Array.isArray(parsed.records)) {
          setImportError("不正なJSON形式です。");
          return;
        }
        setMenus(parsed.menus);
        setMenu(parsed.menus[0] ?? "");
        setRecords(parsed.records);
        setImportError(null);
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
