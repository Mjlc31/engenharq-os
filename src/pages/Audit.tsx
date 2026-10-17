import React, { useEffect, useState, useMemo } from 'react';
import { Download, Search, Clock, Eye, X, ChevronLeft, ChevronRight, ShieldCheck, Activity } from 'lucide-react';
import { auditService, AuditLogItem } from '../services/auditService';

export function Audit() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Details Modal
  const [inspectingItem, setInspectingItem] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await auditService.getAuditLogs();
      setLogs(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.userName))).filter(Boolean);
  }, [logs]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.type))).filter(Boolean);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        l.description.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.ipAddress.includes(q);

      const matchType = !selectedType || l.type === selectedType;
      const matchUser = !selectedUser || l.userName === selectedUser;
      
      let matchDate = true;
      if (selectedDate) {
        const itemDateStr = new Date(l.timestamp).toISOString().split('T')[0];
        matchDate = itemDateStr === selectedDate;
      }

      return matchSearch && matchType && matchUser && matchDate;
    });
  }, [logs, searchTerm, selectedType, selectedUser, selectedDate]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Cabeçalho matching Imagem 2 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" /> Auditoria
          </h1>
          <p className="text-xs lg:text-sm text-muted mt-1">Registros de ações realizadas no sistema</p>
        </div>

        <button
          onClick={() => auditService.exportToCSV(filteredLogs)}
          disabled={filteredLogs.length === 0}
          className="bg-surface border border-border hover:bg-surface-hover text-foreground font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-primary" /> Exportar
        </button>
      </div>

      {/* Barra de Filtros matching Imagem 2 */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar nos registros..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Todos os tipos</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={e => { setSelectedUser(e.target.value); setCurrentPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Todos os usuários</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Tabela de Auditoria matching Imagem 2 */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-surface-hover text-muted uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Módulo</th>
                <th className="p-4">Descrição</th>
                <th className="p-4 font-mono">IP</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Carregando registros de auditoria...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Nenhum registro de auditoria encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const d = new Date(log.timestamp);
                  const dateStr = d.toLocaleDateString('pt-BR');
                  const timeStr = d.toLocaleTimeString('pt-BR');

                  return (
                    <tr key={log.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="p-4 text-muted">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{dateStr}, {timeStr}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${log.userColor}`}>
                            {log.userInitials}
                          </div>
                          <span className="font-semibold text-foreground">{log.userName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${log.typeBadgeColor}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-muted font-medium">{log.module}</td>
                      <td className="p-4 text-foreground font-medium max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="p-4 text-muted font-mono">{log.ipAddress}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setInspectingItem(log)}
                          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                          title="Ver detalhes da ação"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação matching Imagem 2 */}
        <div className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong className="text-foreground">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a{' '}
              <strong className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> de{' '}
              <strong className="text-foreground">{filteredLogs.length}</strong> registros
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Por página:</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 bg-surface border border-border rounded text-muted hover:text-foreground disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 bg-surface border border-border rounded text-muted hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 bg-primary text-background font-bold rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 bg-surface border border-border rounded text-muted hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages || 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 bg-surface border border-border rounded text-muted hover:text-foreground disabled:opacity-40"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes da Ação */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">Detalhes da Transação de Auditoria</h3>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="text-muted hover:text-foreground p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-background border border-border rounded-lg">
                <div>
                  <span className="text-muted">Data/Hora:</span>
                  <div className="font-semibold text-foreground font-mono mt-0.5">
                    {new Date(inspectingItem.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Usuário Responsável:</span>
                  <div className="font-semibold text-foreground mt-0.5">{inspectingItem.userName}</div>
                </div>
                <div>
                  <span className="text-muted">Tipo de Ação:</span>
                  <div className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectingItem.typeBadgeColor}`}>
                      {inspectingItem.type}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted">Módulo:</span>
                  <div className="font-semibold text-foreground mt-0.5">{inspectingItem.module}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted">Endereço IP / Host:</span>
                  <div className="font-mono text-muted mt-0.5">{inspectingItem.ipAddress}</div>
                </div>
              </div>

              <div>
                <span className="text-muted font-medium">Descrição Completa:</span>
                <p className="mt-1 p-3 bg-background border border-border rounded-lg text-foreground font-medium leading-relaxed">
                  {inspectingItem.description}
                </p>
              </div>

              {inspectingItem.details && (
                <div>
                  <span className="text-muted font-medium">Metadados Técnicos:</span>
                  <pre className="mt-1 p-3 bg-background border border-border rounded-lg text-[11px] font-mono text-muted overflow-x-auto">
                    {JSON.stringify(inspectingItem.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end bg-surface-hover/20">
              <button
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground font-semibold rounded-md text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
