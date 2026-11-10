import { useState } from 'react'
import { IPE_CATALOG, HEA_CATALOG, HEB_CATALOG, RHS_CATALOG, CHS_CATALOG } from '../profiles'
import type { SteelProfile } from '../profiles'

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
                        <div className="catalog-meta">{p.h} × {p.b}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
