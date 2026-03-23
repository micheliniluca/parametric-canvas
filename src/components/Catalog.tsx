import { useState } from 'react'
import { IPE_CATALOG, HEA_CATALOG, HEB_CATALOG, RHS_CATALOG, CHS_CATALOG, SteelProfile } from '../profiles'

type Props = {
    onSelect: (profile: SteelProfile) => void
}

export function Catalog({ onSelect }: Props) {
    const [activeTab, setActiveTab] = useState<'IPE' | 'HEA' | 'HEB' | 'RHS' | 'CHS'>('IPE')

    const getList = () => {
        switch (activeTab) {
            case 'IPE': return IPE_CATALOG
            case 'HEA': return HEA_CATALOG
            case 'HEB': return HEB_CATALOG
            case 'RHS': return RHS_CATALOG
            case 'CHS': return CHS_CATALOG
        }
    }

    return (
        <div className="catalog">
            <div className="catalog-tabs">
                {(['IPE', 'HEA', 'HEB', 'RHS', 'CHS'] as const).map(t => (
                    <button
                        key={t}
                        className={activeTab === t ? 'active' : ''}
                        onClick={() => setActiveTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="catalog-list">
                {getList().map(p => (
                    <div
                        key={p.name}
                        className="catalog-item"
                        onClick={() => onSelect(p)}
                    >
                        <div className="catalog-name">{p.name}</div>
                        <div className="catalog-meta">h:{p.h} b:{p.b}</div>
                    </div>
                ))}
            </div>
            <style>{`
        .catalog {
            display: flex;
            flex-direction: column;
            gap: 10px;
            height: 100%;
        }
        .catalog-tabs {
            display: flex;
            gap: 5px;
        }
        .catalog-tabs button {
            flex: 1;
            padding: 5px;
            cursor: pointer;
            background: #eee;
            border: none;
            border-radius: 4px;
        }
        .catalog-tabs button.active {
            background: #333;
            color: #fff;
        }
        .catalog-list {
            flex: 1;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .catalog-item {
            padding: 8px;
            border-bottom: 1px solid #f5f5f5;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
        }
        .catalog-item:hover {
            background: #f9f9f9;
        }
        .catalog-meta {
            color: #888;
            font-size: 0.8em;
        }
      `}</style>
        </div>
    )
}
