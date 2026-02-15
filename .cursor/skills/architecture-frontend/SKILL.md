---
name: architecture-frontend
description: フロントエンドのContainer/Presentational分離とカスタムフック設計。新規画面・ページ作成、Reactコンポーネント構造設計、フロント側リファクタ時に使用
---

# フロントエンドアーキテクチャ設計

## 🏗️ コンポーネント設計アーキテクチャ

### 責務分離パターン

- **ページコンポーネント**: Containerとして機能、ビジネスロジックと状態管理を担当
- **UIコンポーネント**: Presentationalとして実装、表示のみを担当
- **カスタムフック**: ロジックの再利用と関心の分離、API呼び出しは`useXXX`フックに集約

### Container/Presentational判断基準

#### Containerコンポーネントに配置すべき処理

- API呼び出し（useQuery、useMutation）
- 状態管理（useState、useReducer）
- ビジネスロジック（計算、判定、データ変換）
- イベントハンドラー（onClick、onSubmit等）

#### Presentationalコンポーネントに配置すべき処理

- UI表示のみ
- Propsから受け取ったデータの表示
- 表示用のフォーマット処理
- スタイリング関連の処理

#### 判断基準

- **API呼び出しがある** → Container
- **複雑な状態管理がある** → Container
- **ビジネスロジックがある** → Container
- **表示のみ** → Presentational

### 複雑度の判断基準

#### 複雑な状態管理の定義

- **3つ以上のuseState** → 複雑
- **useReducerが必要** → 複雑
- **useEffectの依存配列が5つ以上** → 複雑
- **状態の相互依存が3つ以上** → 複雑
- **状態更新の条件分岐が5つ以上** → 複雑

#### ビジネスロジックの定義

- **データ変換処理** → ビジネスロジック
- **計算・判定処理** → ビジネスロジック
- **バリデーション処理** → ビジネスロジック
- **if文のネストが3層以上** → ビジネスロジック
- **switch文が10ケース以上** → ビジネスロジック

### ビジネスロジック具体例

```typescript
// Containerコンポーネントの例
export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');

  // ビジネスロジック: 顧客データのフィルタリング
  const filterCustomers = useCallback((customers: Customer[], search: string) => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase())
    );
  }, []);

  // ビジネスロジック: 顧客データのソート
  const sortCustomers = useCallback((customers: Customer[], sortBy: string) => {
    return [...customers].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, []);

  // 複雑な状態管理: フィルタリングとソートの組み合わせ
  useEffect(() => {
    const filtered = filterCustomers(customers, searchTerm);
    const sorted = sortCustomers(filtered, sortBy);
    setFilteredCustomers(sorted);
  }, [customers, searchTerm, sortBy, filterCustomers, sortCustomers]);

  return (
    <div>
      <CustomerSearch onSearch={setSearchTerm} />
      <CustomerList customers={filteredCustomers} />
    </div>
  );
}
```

### コンポーネント構造設計

```typescript
// ページコンポーネント（Container）
export default function Customers() {
  const { customers, isLoading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  return (
    <div className="container mx-auto p-6">
      <CustomerToolbar onSearch={handleSearch} />
      <CustomerList
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <CustomerDialog
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

// UIコンポーネント（Presentational）
interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
}

export function CustomerList({ customers, onEdit, onDelete }: CustomerListProps) {
  // 表示のみを担当
}
```

## 🔧 カスタムフック設計アーキテクチャ

### API呼び出しパターン

- **集約**: `useXXX`フックに集約
- **再利用性**: 複数コンポーネントで使用可能なロジック
- **関心の分離**: ビジネスロジックと表示ロジックの分離

### 状態管理パターン

- **ローカル状態**: useState、useReducer
- **サーバー状態**: TanStack Query
- **グローバル状態**: Context API（必要最小限）

### カスタムフック構造設計

```typescript
export function useCustomers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers", searchTerm, filter],
    queryFn: async () => {
      const params = new URLSearchParams({ search: searchTerm });
      const res = await apiRequest("GET", `/api/customers?${params}`, undefined);
      return await res.json();
    },
  });

  return {
    customers: customers || [],
    isLoading,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
  };
}
```

## 🏛️ ページ構造アーキテクチャ

### コンテナ設計

- **適切なコンテナ構造**: レイアウトとコンテンツの分離
- **ダイアログ配置**: ページコンポーネント内でダイアログを定義
- **条件レンダリング**: viewModeや状態に応じた条件レンダリング

### ページ構造設計

```typescript
export default function Customers() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <CustomerToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setIsDialogOpen(true)}
      />

      {viewMode === 'list' ? (
        <CustomerList />
      ) : (
        <CustomerGrid />
      )}

      <CustomerDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
```

## 🔄 状態管理アーキテクチャ

### 状態の分類と配置

- **ローカル状態**: コンポーネント内の状態管理
- **サーバー状態**: TanStack Queryによるサーバーデータ管理
- **グローバル状態**: アプリケーション全体で共有する状態

### 状態管理設計

```typescript
// ローカル状態
const [selectedItems, setSelectedItems] = useState<string[]>([]);

// サーバー状態
const { data: customers, isLoading } = useQuery({
  queryKey: ["/api/customers"],
  queryFn: fetchCustomers,
});

// グローバル状態（必要時のみ）
const { user, setUser } = useAuth();
```

## 🎯 型定義アーキテクチャ

### フロントエンド固有型

- **Props型**: interfaceで型定義
- **コンポーネント状態型**: ローカル状態の型定義
- **イベントハンドラー型**: イベント処理の型定義

## 🔗 API連携アーキテクチャ

### フロントエンドAPI呼び出しパターン

- **認証**: `apiRequest`により自動処理
- **エラーハンドリング**: 統一されたエラーハンドリング
- **キャッシュ管理**: TanStack Queryによるキャッシュ戦略

## 📦 フロントエンドユーティリティアーキテクチャ

### フロントエンド固有ユーティリティ

- **フォーマット関数**: 表示用フォーマット
- **バリデーション関数**: クライアント側バリデーション
- **DOM操作関数**: ブラウザ固有処理

## 🎨 コンポーネント分離アーキテクチャ

### 分離パターン

- **検索・フィルター**: 独立したコンポーネントとして分離
- **リスト表示**: 再利用可能なコンポーネント
- **フォーム**: 独立したフォームコンポーネント

### 分離設計

```typescript
// 検索・フィルターコンポーネント
export function CustomerToolbar({
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange
}: CustomerToolbarProps) {
  return (
    <div className="flex gap-4 mb-6">
      <Input
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="顧客を検索..."
      />
      <Select value={filter.status} onValueChange={onFilterChange}>
        {/* 選択肢 */}
      </Select>
    </div>
  );
}
```
