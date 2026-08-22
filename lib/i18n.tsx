"use client";

import { report } from "process";
import {

  createContext,

  useContext,

  useEffect,

  useState,

} from "react";

type Lang = "pt" | "fr" | "en";



type Dictionary = Record<

  string,

  {

    pt: string;

    fr: string;

    en: string;

  }

>;


const dictionary: Dictionary = {

  aiLoadError: {
  pt: "Erro ao carregar a IA.",
  fr: "Erreur lors du chargement de l’IA.",
  en: "Error while loading AI.",
},

aiContactError: {
  pt: "Não foi possível contactar o motor IA.",
  fr: "Impossible de contacter le moteur IA.",
  en: "Unable to contact the AI engine.",
},

aiAnalysisError: {
  pt: "Erro durante a análise IA.",
  fr: "Erreur lors de l’analyse IA.",
  en: "Error during AI analysis.",
},

aiLoading: {
  pt: "Carregando inteligência artificial...",
  fr: "Chargement de l’intelligence artificielle...",
  en: "Loading artificial intelligence...",
},

aiStatusStable: {
  pt: "Estável",
  fr: "Stable",
  en: "Stable",
},

aiStatusWatch: {
  pt: "A monitorizar",
  fr: "À surveiller",
  en: "Under watch",
},

aiStatusRisk: {
  pt: "Risco elevado",
  fr: "Risque élevé",
  en: "High risk",
},

aiBusinessStatus: {
  pt: "Estado da empresa",
  fr: "État entreprise",
  en: "Business status",
},

aiAlerts: {
  pt: "Alertas IA",
  fr: "Alertes IA",
  en: "AI Alerts",
},

aiMemories: {
  pt: "Memórias IA",
  fr: "Mémoires IA",
  en: "AI Memories",
},

aiRecommendations: {
  pt: "Recomendações IA",
  fr: "Recommandations IA",
  en: "AI Recommendations",
},

aiForecasts: {
  pt: "Previsões IA",
  fr: "Prévisions IA",
  en: "AI Forecasts",
},

aiAnalyzeNow: {
  pt: "Analisar agora",
  fr: "Analyser maintenant",
  en: "Analyze now",
},

  changeLanguage: {
  pt: "Mudar língua",
  fr: "Changer la langue",
  en: "Change language",
},

changeCurrency: {
  pt: "Mudar moeda",
  fr: "Changer la monnaie",
  en: "Change currency",
},

  managementAdviceDescription: {
  pt: "Futuro assistente inteligente para analisar vendas, stock, custos, lucros e sugerir decisões.",
  fr: "Futur assistant intelligent pour analyser les ventes, le stock, les coûts, les bénéfices et suggérer des décisions.",
  en: "Future intelligent assistant to analyze sales, stock, costs, profits and suggest decisions.",
},

aiManagementPreparing: {
  pt: "IA de gestão em preparação",
  fr: "IA de gestion en préparation",
  en: "Management AI in preparation",
},

aiManagementPreparingDescription: {
  pt: "Esta área será usada para gerar recomendações automáticas: compras a planear, produtos parados, margem baixa, custos elevados, cantinas com baixa performance e previsão de lucro.",
  fr: "Cette zone sera utilisée pour générer des recommandations automatiques : achats à planifier, produits bloqués, faible marge, coûts élevés, cantines peu performantes et prévisions de bénéfices.",
  en: "This area will be used to generate automatic recommendations: purchases to plan, slow products, low margins, high costs, low-performing cantinas and profit forecasting.",
},

salesAnalysis: {
  pt: "Análise de vendas",
  fr: "Analyse des ventes",
  en: "Sales analysis",
},

purchaseSuggestions: {
  pt: "Sugestão de compras",
  fr: "Suggestions d’achats",
  en: "Purchase suggestions",
},

lowMarginAlerts: {
  pt: "Alertas de margem baixa",
  fr: "Alertes de faible marge",
  en: "Low margin alerts",
},

slowProducts: {
  pt: "Produtos parados",
  fr: "Produits bloqués",
  en: "Slow products",
},

profitForecast: {
  pt: "Previsão de lucro",
  fr: "Prévision des bénéfices",
  en: "Profit forecast",
},

cantinaComparison: {
  pt: "Comparação de cantinas",
  fr: "Comparaison des cantines",
  en: "Cantina comparison",
},

futureCapabilities: {
  pt: "Funcionalidades futuras",
  fr: "Fonctionnalités futures",
  en: "Future capabilities",
},

stockPrediction: {
  pt: "Previsão de ruptura de stock",
  fr: "Prévision de rupture de stock",
  en: "Stock shortage prediction",
},

predictiveAlerts: {
  pt: "Alertas preditivos",
  fr: "Alertes prédictives",
  en: "Predictive alerts",
},

advancedStatistics: {
  pt: "Estatísticas avançadas",
  fr: "Statistiques avancées",
  en: "Advanced statistics",
},

behaviorAnalysis: {
  pt: "Análise de comportamento",
  fr: "Analyse comportementale",
  en: "Behavior analysis",
},

automaticRecommendations: {
  pt: "Recomendações automáticas",
  fr: "Recommandations automatiques",
  en: "Automatic recommendations",
},

businessIntelligence: {
  pt: "Business Intelligence",
  fr: "Business Intelligence",
  en: "Business Intelligence",
},

aiModuleDeployMessage: {
  pt: "O módulo IA será ligado posteriormente através de um serviço Python avançado conectado ao ERP.",
  fr: "Le module IA sera connecté ultérieurement via un service Python avancé relié à l’ERP.",
  en: "The AI module will later be connected through an advanced Python service linked to the ERP.",
},

  eventsAgenda: {
  pt: "Agenda de eventos",
  fr: "Agenda des événements",
  en: "Events agenda",
},

eventsAgendaDescription: {
  pt: "Planeia compras, salários, transferências, custos, reuniões e manutenções.",
  fr: "Planifiez les achats, salaires, transferts, coûts, réunions et maintenances.",
  en: "Plan purchases, salaries, transfers, costs, meetings and maintenance.",
},

newEvent: {
  pt: "Novo evento",
  fr: "Nouvel événement",
  en: "New event",
},

editEvent: {
  pt: "Editar evento",
  fr: "Modifier l’événement",
  en: "Edit event",
},

saveEvent: {
  pt: "Guardar evento",
  fr: "Enregistrer l’événement",
  en: "Save event",
},

createEventThisDay: {
  pt: "Criar evento neste dia",
  fr: "Créer un événement ce jour",
  en: "Create event on this day",
},

selectedDay: {
  pt: "Dia selecionado",
  fr: "Jour sélectionné",
  en: "Selected day",
},

noEventThisDay: {
  pt: "Nenhum evento neste dia.",
  fr: "Aucun événement ce jour.",
  en: "No event on this day.",
},

moreEvents: {
  pt: "evento(s)",
  fr: "événement(s)",
  en: "event(s)",
},

eventColor: {
  pt: "Cor do evento",
  fr: "Couleur de l’événement",
  en: "Event color",
},

dateAndTime: {
  pt: "Data e hora",
  fr: "Date et heure",
  en: "Date and time",
},

eventDescriptionPlaceholder: {
  pt: "Ex: programar compra de arroz, pagamento de salário, transferência para cantina...",
  fr: "Ex : programmer l’achat de riz, paiement de salaire, transfert vers une cantine...",
  en: "Ex: schedule rice purchase, salary payment, transfer to canteen...",
},

deleteEventQuestion: {
  pt: "Apagar evento?",
  fr: "Supprimer l’événement ?",
  en: "Delete event?",
},

deleteEventConfirm: {
  pt: "Desejas apagar o evento",
  fr: "Voulez-vous supprimer l’événement",
  en: "Do you want to delete the event",
},

eventLoadError: {
  pt: "Erro ao carregar eventos.",
  fr: "Erreur lors du chargement des événements.",
  en: "Error loading events.",
},

eventSaveError: {
  pt: "Erro ao guardar evento.",
  fr: "Erreur lors de l’enregistrement de l’événement.",
  en: "Error saving event.",
},

eventSavedSuccess: {
  pt: "Evento guardado com sucesso.",
  fr: "Événement enregistré avec succès.",
  en: "Event saved successfully.",
},

eventDeleteError: {
  pt: "Erro ao apagar evento.",
  fr: "Erreur lors de la suppression de l’événement.",
  en: "Error deleting event.",
},

eventDeletedSuccess: {
  pt: "Evento apagado com sucesso.",
  fr: "Événement supprimé avec succès.",
  en: "Event deleted successfully.",
},

markAsDone: {
  pt: "Marcar como concluído",
  fr: "Marquer comme terminé",
  en: "Mark as done",
},

eventTypePurchase: {
  pt: "Compra",
  fr: "Achat",
  en: "Purchase",
},

eventTypeSalary: {
  pt: "Salário",
  fr: "Salaire",
  en: "Salary",
},

eventTypeTransfer: {
  pt: "Transferência",
  fr: "Transfert",
  en: "Transfer",
},

eventTypeCost: {
  pt: "Custo",
  fr: "Coût",
  en: "Cost",
},

eventTypeMeeting: {
  pt: "Reunião",
  fr: "Réunion",
  en: "Meeting",
},

eventTypeMaintenance: {
  pt: "Manutenção",
  fr: "Maintenance",
  en: "Maintenance",
},

eventTypeOther: {
  pt: "Outro",
  fr: "Autre",
  en: "Other",
},

priorityLow: {
  pt: "Baixa",
  fr: "Basse",
  en: "Low",
},

priorityNormal: {
  pt: "Normal",
  fr: "Normale",
  en: "Normal",
},

priorityHigh: {
  pt: "Alta",
  fr: "Haute",
  en: "High",
},

priorityUrgent: {
  pt: "Urgente",
  fr: "Urgente",
  en: "Urgent",
},

statusPending: {
  pt: "Pendente",
  fr: "En attente",
  en: "Pending",
},

statusDone: {
  pt: "Concluído",
  fr: "Terminé",
  en: "Done",
},

statusCancelled: {
  pt: "Cancelado",
  fr: "Annulé",
  en: "Cancelled",
},

sundayShort: {
  pt: "Dom",
  fr: "Dim",
  en: "Sun",
},

mondayShort: {
  pt: "Seg",
  fr: "Lun",
  en: "Mon",
},

tuesdayShort: {
  pt: "Ter",
  fr: "Mar",
  en: "Tue",
},

wednesdayShort: {
  pt: "Qua",
  fr: "Mer",
  en: "Wed",
},

thursdayShort: {
  pt: "Qui",
  fr: "Jeu",
  en: "Thu",
},

fridayShort: {
  pt: "Sex",
  fr: "Ven",
  en: "Fri",
},

saturdayShort: {
  pt: "Sáb",
  fr: "Sam",
  en: "Sat",
},
  reminders: {
  pt: "Lembretes",
  fr: "Rappels",
  en: "Reminders",
},

reminder: {
  pt: "Lembrete",
  fr: "Rappel",
  en: "Reminder",
},

eventReminder: {
  pt: "Lembrete de evento",
  fr: "Rappel d'événement",
  en: "Event reminder",
},

reminderSent: {
  pt: "Lembrete enviado",
  fr: "Rappel envoyé",
  en: "Reminder sent",
},

upcomingReminder: {
  pt: "Lembrete próximo",
  fr: "Rappel à venir",
  en: "Upcoming reminder",
},

createReminder: {
  pt: "Criar lembrete",
  fr: "Créer un rappel",
  en: "Create reminder",
},

editReminder: {
  pt: "Editar lembrete",
  fr: "Modifier le rappel",
  en: "Edit reminder",
},

deleteReminder: {
  pt: "Eliminar lembrete",
  fr: "Supprimer le rappel",
  en: "Delete reminder",
},

reminderTitle: {
  pt: "Título do lembrete",
  fr: "Titre du rappel",
  en: "Reminder title",
},

reminderMessage: {
  pt: "Mensagem do lembrete",
  fr: "Message du rappel",
  en: "Reminder message",
},

reminderDate: {
  pt: "Data do lembrete",
  fr: "Date du rappel",
  en: "Reminder date",
},

reminderTime: {
  pt: "Hora do lembrete",
  fr: "Heure du rappel",
  en: "Reminder time",
},

noReminders: {
  pt: "Nenhum lembrete encontrado",
  fr: "Aucun rappel trouvé",
  en: "No reminders found",
},

reminderCreated: {
  pt: "Lembrete criado com sucesso",
  fr: "Rappel créé avec succès",
  en: "Reminder created successfully",
},

reminderUpdated: {
  pt: "Lembrete atualizado com sucesso",
  fr: "Rappel mis à jour avec succès",
  en: "Reminder updated successfully",
},

reminderDeleted: {
  pt: "Lembrete eliminado com sucesso",
  fr: "Rappel supprimé avec succès",
  en: "Reminder deleted successfully",
},

reminderNotification: {
  pt: "Notificação de lembrete",
  fr: "Notification de rappel",
  en: "Reminder notification",
},

eventStartsSoon: {
  pt: "O evento começa em breve",
  fr: "L'événement commence bientôt",
  en: "The event starts soon",
},

minutesBefore: {
  pt: "Minutos antes",
  fr: "Minutes avant",
  en: "Minutes before",
},

hoursBefore: {
  pt: "Horas antes",
  fr: "Heures avant",
  en: "Hours before",
},

daysBefore: {
  pt: "Dias antes",
  fr: "Jours avant",
  en: "Days before",
},

sendReminder: {
  pt: "Enviar lembrete",
  fr: "Envoyer le rappel",
  en: "Send reminder",
},

automaticReminder: {
  pt: "Lembrete automático",
  fr: "Rappel automatique",
  en: "Automatic reminder",
},

reminderSettings: {
  pt: "Configurações de lembretes",
  fr: "Paramètres des rappels",
  en: "Reminder settings",
},

enableReminders: {
  pt: "Ativar lembretes",
  fr: "Activer les rappels",
  en: "Enable reminders",
},

disableReminders: {
  pt: "Desativar lembretes",
  fr: "Désactiver les rappels",
  en: "Disable reminders",
},
 
  emitInvoice: {
  pt: "Emitir factura ",
  fr: "Émettre la facture ",
  en: "Issue invoice ",
},
doYouWantToEmitInvoice: {pt: "Deseja emitir a factura?", fr: "Voulez-vous émettre la facture  ?", en: "Do you want to issue the invoice ?" },
doNotEmit: { pt: "Não emitir", fr: "Ne pas émettre", en: "Do not issue" },
  saleNotFoundForInvoice: {
  pt: "Venda não encontrada para emitir factura.",
  fr: "Vente introuvable pour émettre la facture.",
  en: "Sale not found to issue invoice.",
},

  january: {
  pt: "Janeiro",
  fr: "Janvier",
  en: "January",
},

february: {
  pt: "Fevereiro",
  fr: "Février",
  en: "February",
},

march: {
  pt: "Março",
  fr: "Mars",
  en: "March",
},

april: {
  pt: "Abril",
  fr: "Avril",
  en: "April",
},

may: {
  pt: "Maio",
  fr: "Mai",
  en: "May",
},

june: {
  pt: "Junho",
  fr: "Juin",
  en: "June",
},

july: {
  pt: "Julho",
  fr: "Juillet",
  en: "July",
},

august: {
  pt: "Agosto",
  fr: "Août",
  en: "August",
},

september: {
  pt: "Setembro",
  fr: "Septembre",
  en: "September",
},

october: {
  pt: "Outubro",
  fr: "Octobre",
  en: "October",
},

november: {
  pt: "Novembro",
  fr: "Novembre",
  en: "November",
},

december: {
  pt: "Dezembro",
  fr: "Décembre",
  en: "December",
},

invoice: { pt: "Factura", fr: "Facture", en: "Invoice" },
invoiceNumber: { pt: "Nº da factura", fr: "N° de facture", en: "Invoice number" },
loadingInvoice: { pt: "Carregando factura...", fr: "Chargement de la facture...", en: "Loading invoice..." },
invoiceNotFound: { pt: "Factura não encontrada.", fr: "Facture introuvable.", en: "Invoice not found." },
downloadPdf: { pt: "Baixar PDF", fr: "Télécharger PDF", en: "Download PDF" },
print: { pt: "Imprimir", fr: "Imprimer", en: "Print" },
automaticCommercialDocument: {
  pt: "Documento comercial emitido automaticamente",
  fr: "Document commercial émis automatiquement",
  en: "Commercial document issued automatically",
},
number: { pt: "Nº", fr: "N°", en: "No." },
company: { pt: "Empresa", fr: "Entreprise", en: "Company" },
customer: { pt: "Cliente", fr: "Client", en: "Customer" },
finalCustomer: { pt: "Cliente final", fr: "Client final", en: "Final customer" },
issued: { pt: "Emitida", fr: "Émise", en: "Issued" },
country: { pt: "País", fr: "Pays", en: "Country" },
currency: { pt: "Moeda", fr: "Devise", en: "Currency" },
invoiceFooter: {
  pt: "Documento emitido pelo sistema Norbee ERP.",
  fr: "Document émis par le système Norbee ERP.",
  en: "Document issued by Norbee ERP system.",
},
invoiceSaveNotice: {
  pt: "Esta factura foi emitida pelo Norbee ERP. Guarde este documento como comprovativo da operação.",
  fr: "Cette facture a été émise par Norbee ERP. Conservez ce document comme justificatif de l’opération.",
  en: "This invoice was issued by Norbee ERP. Keep this document as proof of the operation.",
},
invoiceIssuedSuccess: {
  pt: "Factura emitida com sucesso.",
  fr: "Facture émise avec succès.",
  en: "Invoice issued successfully.",
},

stockManagement: { pt: "Gestão de Stock", fr: "Gestion du stock", en: "Stock management" },
stockManagementDescription: { pt: "Stock central, produtos, compras, fornecedores, categorias e transferências.", fr: "Stock central, produits, achats, fournisseurs, catégories et transferts.", en: "Central stock, products, purchases, suppliers, categories and transfers." },
stockLoadError: { pt: "Erro ao carregar stock.", fr: "Erreur lors du chargement du stock.", en: "Error loading stock." },
transactionLoadError: { pt: "Erro ao carregar transações.", fr: "Erreur lors du chargement des transactions.", en: "Error loading transactions." },
productNotFoundForBarcode: { pt: "Produto inexistente para este código de barras.", fr: "Produit introuvable pour ce code-barres.", en: "Product not found for this barcode." },

products: { pt: "Produtos", fr: "Produits", en: "Products" },
entry: { pt: "Entrada", fr: "Entrée", en: "Entry" },
exit: { pt: "Saída", fr: "Sortie", en: "Exit" },
suppliers: { pt: "Fornecedores", fr: "Fournisseurs", en: "Suppliers" },
totalQuantity: { pt: "Quantidade total", fr: "Quantité totale", en: "Total quantity" },
lowStock: { pt: "Stock baixo", fr: "Stock faible", en: "Low stock" },
low: { pt: "Baixo", fr: "Faible", en: "Low" },

searchProductCodeBarcode: { pt: "Pesquisar produto, código ou barcode...", fr: "Rechercher produit, code ou code-barres...", en: "Search product, code or barcode..." },
scanBarcodeEnter: { pt: "Scanner código de barras + Enter", fr: "Scanner le code-barres + Entrée", en: "Scan barcode + Enter" },
loadingStock: { pt: "Carregando stock...", fr: "Chargement du stock...", en: "Loading stock..." },
noProductFound: { pt: "Nenhum produto encontrado.", fr: "Aucun produit trouvé.", en: "No product found." },
noBarcode: { pt: "sem barcode", fr: "sans code-barres", en: "no barcode" },
addProduct: { pt: "Adicionar produto", fr: "Ajouter un produit", en: "Add product" },
newProduct: { pt: "Novo produto", fr: "Nouveau produit", en: "New product" },
createProduct: { pt: "Criar produto", fr: "Créer le produit", en: "Create product" },
editProduct: { pt: "Editar produto", fr: "Modifier le produit", en: "Edit product" },
deleteProduct: { pt: "Apagar produto", fr: "Supprimer le produit", en: "Delete product" },
deleteProductConfirm: { pt: "Deseja apagar/desativar o produto", fr: "Voulez-vous supprimer/désactiver le produit", en: "Do you want to delete/deactivate product" },
deleteProductWarning: { pt: "Se o produto já tiver histórico de vendas, compras ou transferências, ele será apenas desativado para preservar os relatórios.", fr: "Si le produit possède déjà un historique de ventes, achats ou transferts, il sera seulement désactivé afin de préserver les rapports.", en: "If the product already has sales, purchases or transfer history, it will only be deactivated to preserve reports." },

productCreateError: { pt: "Erro ao criar produto.", fr: "Erreur lors de la création du produit.", en: "Error creating product." },
productEditError: { pt: "Erro ao editar produto.", fr: "Erreur lors de la modification du produit.", en: "Error editing product." },
productDeleteError: { pt: "Erro ao apagar produto.", fr: "Erreur lors de la suppression du produit.", en: "Error deleting product." },

goodsEntry: { pt: "Entrada de mercadoria", fr: "Entrée de marchandise", en: "Goods entry" },
receiveNow: { pt: "Receber agora", fr: "Recevoir maintenant", en: "Receive now" },
receiveLater: { pt: "Receber depois", fr: "Recevoir plus tard", en: "Receive later" },
writeProductNameCode: { pt: "Escreva o nome/código do produto", fr: "Saisissez le nom/code du produit", en: "Write the product name/code" },
writeProductName: { pt: "Escreva o nome do produto", fr: "Saisissez le nom du produit", en: "Write the product name" },
productNotFound: { pt: "Produto inexistente.", fr: "Produit inexistant.", en: "Product not found." },
addToList: { pt: "Adicionar à lista", fr: "Ajouter à la liste", en: "Add to list" },
registerEntry: { pt: "Registar entrada", fr: "Enregistrer l’entrée", en: "Register entry" },
entryProducts: { pt: "Produtos da entrada", fr: "Produits de l’entrée", en: "Entry products" },
noEntryProductAdded: { pt: "Nenhum produto adicionado à entrada.", fr: "Aucun produit ajouté à l’entrée.", en: "No product added to the entry." },

selectAtLeastOneProduct: { pt: "Selecione pelo menos um produto.", fr: "Sélectionnez au moins un produit.", en: "Select at least one product." },
invalidQuantity: { pt: "Informe uma quantidade válida.", fr: "Indiquez une quantité valide.", en: "Enter a valid quantity." },
productsAlreadyInList: { pt: "Os produtos selecionados já estão na lista.", fr: "Les produits sélectionnés sont déjà dans la liste.", en: "Selected products are already in the list." },
addAtLeastOnePurchaseProduct: { pt: "Adicione pelo menos um produto à entrada.", fr: "Ajoutez au moins un produit à l’entrée.", en: "Add at least one product to the entry." },
purchaseRegisterError: { pt: "Erro ao registar entrada.", fr: "Erreur lors de l’enregistrement de l’entrée.", en: "Error registering entry." },

transferList: { pt: "Lista de transferência", fr: "Liste de transfert", en: "Transfer list" },
transferStockToCantina: { pt: "Transferir stock para cantina", fr: "Transférer le stock vers une cantine", en: "Transfer stock to canteen" },
transferStock: { pt: "Transferir stock", fr: "Transférer le stock", en: "Transfer stock" },
transferring: { pt: "Transferindo...", fr: "Transfert...", en: "Transferring..." },
chooseDestinationCantina: { pt: "Escolha a cantina de destino.", fr: "Choisissez la cantine de destination.", en: "Choose the destination canteen." },
addAtLeastOneTransferProduct: { pt: "Adicione pelo menos um produto à transferência.", fr: "Ajoutez au moins un produit au transfert.", en: "Add at least one product to the transfer." },
transferError: { pt: "Erro ao transferir stock.", fr: "Erreur lors du transfert du stock.", en: "Error transferring stock." },

loadingTransactions: { pt: "Carregando transações...", fr: "Chargement des transactions...", en: "Loading transactions..." },
productCode: { pt: "Produto / código", fr: "Produit / code", en: "Product / code" },
filter: { pt: "Filtrar", fr: "Filtrer", en: "Filter" },

categoryName: { pt: "Nome da categoria", fr: "Nom de la catégorie", en: "Category name" },
saveCategory: { pt: "Guardar categoria", fr: "Enregistrer la catégorie", en: "Save category" },
categorySaveError: { pt: "Erro ao guardar categoria.", fr: "Erreur lors de l’enregistrement de la catégorie.", en: "Error saving category." },
categoryDeleteError: { pt: "Erro ao apagar categoria.", fr: "Erreur lors de la suppression de la catégorie.", en: "Error deleting category." },
deleteCategoryQuestion: { pt: "Apagar a categoria", fr: "Supprimer la catégorie", en: "Delete category" },

supplierSaveError: { pt: "Erro ao guardar fornecedor.", fr: "Erreur lors de l’enregistrement du fournisseur.", en: "Error saving supplier." },
supplierDeleteError: { pt: "Erro ao apagar fornecedor.", fr: "Erreur lors de la suppression du fournisseur.", en: "Error deleting supplier." },
deleteSupplierQuestion: { pt: "Apagar o fornecedor", fr: "Supprimer le fournisseur", en: "Delete supplier" },

internalCode: { pt: "Código interno", fr: "Code interne", en: "Internal code" },
barcode: { pt: "Código de barras", fr: "Code-barres", en: "Barcode" },
unit: { pt: "Unidade", fr: "Unité", en: "Unit" },
minimumStock: { pt: "Stock mínimo", fr: "Stock minimum", en: "Minimum stock" },
purchasePrice: { pt: "Preço compra", fr: "Prix d’achat", en: "Purchase price" },
initialQuantity: { pt: "Quantidade inicial", fr: "Quantité initiale", en: "Initial quantity" },
pleaseWait: { pt: "Aguarde...", fr: "Veuillez patienter...", en: "Please wait..." },
taxId: { pt: "NIF", fr: "NIF", en: "Tax ID" },
create: { pt: "Criar", fr: "Créer", en: "Create" },

salaryHistoryDescription: {
  pt: "Pagamentos salariais registados por mês, funcionário e cantina.",
  fr: "Paiements salariaux enregistrés par mois, employé et cantine.",
  en: "Salary payments recorded by month, employee and canteen.",
},

employeeDetails: {
  pt: "Detalhes do funcionário",
  fr: "Détails de l’employé",
  en: "Employee details",
},

removeEmployeeQuestion: {
  pt: "Remover funcionário?",
  fr: "Supprimer l’employé ?",
  en: "Remove employee?",
},

removeEmployeeConfirm: {
  pt: "Desejas remover ou inativar",
  fr: "Voulez-vous supprimer ou désactiver",
  en: "Do you want to remove or deactivate",
},

removeEmployeeWarning: {
  pt: "Se já tiver salários pagos, o sistema vai apenas inativar para preservar o histórico.",
  fr: "S’il a déjà des salaires payés, le système le désactivera seulement afin de préserver l’historique.",
  en: "If salaries have already been paid, the system will only deactivate the employee to preserve history.",
},

removing: {
  pt: "Removendo...",
  fr: "Suppression...",
  en: "Removing...",
},

confirm: {
  pt: "Confirmar",
  fr: "Confirmer",
  en: "Confirm",
},

rhLoadError: {
  pt: "Erro ao carregar RH.",
  fr: "Erreur lors du chargement des RH.",
  en: "Error loading HR.",
},

employeeSaveError: {
  pt: "Erro ao guardar funcionário.",
  fr: "Erreur lors de l’enregistrement de l’employé.",
  en: "Error saving employee.",
},

employeeSavedSuccess: {
  pt: "Funcionário guardado com sucesso.",
  fr: "Employé enregistré avec succès.",
  en: "Employee saved successfully.",
},

employeeDeleteError: {
  pt: "Erro ao apagar funcionário.",
  fr: "Erreur lors de la suppression de l’employé.",
  en: "Error deleting employee.",
},

employeeDeletedSuccess: {
  pt: "Funcionário removido com sucesso.",
  fr: "Employé supprimé avec succès.",
  en: "Employee removed successfully.",
},

paymentError: {
  pt: "Erro ao pagar salário.",
  fr: "Erreur lors du paiement du salaire.",
  en: "Error paying salary.",
},

salaryPaidSuccess: {
  pt: "Salário pago com sucesso.",
  fr: "Salaire payé avec succès.",
  en: "Salary paid successfully.",
},

delayed: {
  pt: "Atrasado",
  fr: "En retard",
  en: "Delayed",
},

paid: {
  pt: "Pago",
  fr: "Payé",
  en: "Paid",
},

name: {
  pt: "Nome",
  fr: "Nom",
  en: "Name",
},

salary: {
  pt: "Salário",
  fr: "Salaire",
  en: "Salary",
},
humanResources: { pt: "Recursos Humanos", fr: "Ressources humaines", en: "Human Resources" },
humanResourcesDescription: { pt: "Funcionários, salários, pagamentos mensais e custos por cantina.", fr: "Employés, salaires, paiements mensuels et coûts par cantine.", en: "Employees, salaries, monthly payments and costs by canteen." },
salaryHistory: { pt: "Histórico", fr: "Historique", en: "History" },
paySalary: { pt: "Pagar salário", fr: "Payer le salaire", en: "Pay salary" },
newEmployee: { pt: "Novo funcionário", fr: "Nouvel employé", en: "New employee" },
activeEmployees: { pt: "Ativos", fr: "Actifs", en: "Active" },
monthlyPayroll: { pt: "Folha salarial", fr: "Masse salariale", en: "Payroll" },
paidThisMonth: { pt: "Pago este mês", fr: "Payé ce mois", en: "Paid this month" },
pendingPayments: { pt: "Pendentes", fr: "En attente", en: "Pending" },
employees: { pt: "Funcionários", fr: "Employés", en: "Employees" },
employeeFilters: { pt: "Filtros de funcionários", fr: "Filtres employés", en: "Employee filters" },
searchEmployee: { pt: "Pesquisar funcionário, função, cantina...", fr: "Rechercher employé, fonction, cantine...", en: "Search employee, role, canteen..." },
allStatuses: { pt: "Todos estados", fr: "Tous les états", en: "All statuses" },
leave: { pt: "Licença", fr: "Congé", en: "Leave" },
generalAdministration: { pt: "Empresa geral", fr: "Entreprise générale", en: "General company" },
loadingHr: { pt: "Carregando RH...", fr: "Chargement RH...", en: "Loading HR..." },
noEmployeeFound: { pt: "Nenhum funcionário encontrado.", fr: "Aucun employé trouvé.", en: "No employee found." },
employee: { pt: "Funcionário", fr: "Employé", en: "Employee" },
role: { pt: "Função", fr: "Fonction", en: "Role" },
baseSalary: { pt: "Salário base", fr: "Salaire de base", en: "Base salary" },
monthlyPayment: { pt: "Pagamento do mês", fr: "Paiement du mois", en: "Monthly payment" },
editEmployee: { pt: "Editar funcionário", fr: "Modifier l’employé", en: "Edit employee" },
removeEmployee: { pt: "Remover funcionário", fr: "Supprimer l’employé", en: "Remove employee" },
fullName: { pt: "Nome completo", fr: "Nom complet", en: "Full name" },
identityDocument: { pt: "Documento / BI", fr: "Document / ID", en: "Document / ID" },
hireDate: { pt: "Data de entrada", fr: "Date d’entrée", en: "Hire date" },
address: { pt: "Morada", fr: "Adresse", en: "Address" },
saveEmployee: { pt: "Guardar funcionário", fr: "Enregistrer l’employé", en: "Save employee" },
chooseEmployee: { pt: "Escolher funcionário", fr: "Choisir un employé", en: "Choose employee" },

  profitAnalysis: {
  pt: "Análise de Lucros",
  fr: "Analyse des profits",
  en: "Profit analysis",
},

profitAnalysisDescription: {
  pt: "Faturação, compras, custos, salários e lucro líquido.",
  fr: "Chiffre d’affaires, achats, coûts, salaires et bénéfice net.",
  en: "Revenue, purchases, costs, salaries and net profit.",
},

update: {
  pt: "Atualizar",
  fr: "Actualiser",
  en: "Update",
},

turnover: {
  pt: "Faturação",
  fr: "Chiffre d’affaires",
  en: "Turnover",
},

costsAndSalaries: {
  pt: "Custos + salários",
  fr: "Coûts + salaires",
  en: "Costs + salaries",
},

netProfit: {
  pt: "Lucro líquido",
  fr: "Bénéfice net",
  en: "Net profit",
},

netMargin: {
  pt: "Margem líquida",
  fr: "Marge nette",
  en: "Net margin",
},

monthlyProfitEvolution: {
  pt: "Evolução mensal do lucro",
  fr: "Évolution mensuelle du bénéfice",
  en: "Monthly profit evolution",
},

topMonths: {
  pt: "Top meses",
  fr: "Top mois",
  en: "Top months",
},

noDataAvailable: {
  pt: "Nenhum dado disponível.",
  fr: "Aucune donnée disponible.",
  en: "No data available.",
},

monthlyProfitTable: {
  pt: "Tabela mensal de lucros",
  fr: "Tableau mensuel des profits",
  en: "Monthly profit table",
},

profitTableDescription: {
  pt: "A tabela ocupa o espaço principal para facilitar a leitura.",
  fr: "Le tableau occupe l’espace principal pour faciliter la lecture.",
  en: "The table occupies the main space to improve readability.",
},

loadingProfits: {
  pt: "Carregando lucros...",
  fr: "Chargement des profits...",
  en: "Loading profits...",
},

profitLoadError: {
  pt: "Erro ao carregar lucros.",
  fr: "Erreur lors du chargement des profits.",
  en: "Error loading profits.",
},

purchase: {
  pt: "Compra",
  fr: "Achat",
  en: "Purchase",
},

transport: {
  pt: "Transporte",
  fr: "Transport",
  en: "Transport",
},

margin: {
  pt: "Margem",
  fr: "Marge",
  en: "Margin",
},

table: {
  pt: "Tabela",
  fr: "Tableau",
  en: "Table",
},

  financialManagement: {
  pt: "Gestão Financeira",
  fr: "Gestion financière",
  en: "Financial management",
},

financialManagementDescription: {
  pt: "Caixa, banco, entradas, saídas, salários, rendas e fluxo financeiro.",
  fr: "Caisse, banque, entrées, sorties, salaires, loyers et flux financier.",
  en: "Cash, bank, income, expenses, salaries, rents and financial flow.",
},

payHr: {
  pt: "Pagar RH",
  fr: "Payer RH",
  en: "Pay HR",
},

rentCosts: {
  pt: "Renda/Custos",
  fr: "Loyer/Coûts",
  en: "Rent/Costs",
},

newAccount: {
  pt: "Nova conta",
  fr: "Nouveau compte",
  en: "New account",
},

newTransaction: {
  pt: "Nova transação",
  fr: "Nouvelle transaction",
  en: "New transaction",
},

availableBalance: {
  pt: "Saldo disponível",
  fr: "Solde disponible",
  en: "Available balance",
},

transactions: {
  pt: "Transações",
  fr: "Transactions",
  en: "Transactions",
},

mainCashRegister: {
  pt: "Caixa principal",
  fr: "Caisse principale",
  en: "Main cash register",
},

main: {
  pt: "Principal",
  fr: "Principal",
  en: "Main",
},

financialFilters: {
  pt: "Filtros financeiros",
  fr: "Filtres financiers",
  en: "Financial filters",
},

allOrigins: {
  pt: "Todas as origens",
  fr: "Toutes les origines",
  en: "All origins",
},

allAccounts: {
  pt: "Todas as contas",
  fr: "Tous les comptes",
  en: "All accounts",
},

applyFilters: {
  pt: "Aplicar filtros",
  fr: "Appliquer les filtres",
  en: "Apply filters",
},

loadingFinances: {
  pt: "Carregando finanças...",
  fr: "Chargement des finances...",
  en: "Loading finances...",
},

noTransactionFound: {
  pt: "Nenhuma transação encontrada.",
  fr: "Aucune transaction trouvée.",
  en: "No transaction found.",
},

transactionWithoutDescription: {
  pt: "Transação sem descrição",
  fr: "Transaction sans description",
  en: "Transaction without description",
},

editTransaction: {
  pt: "Editar transação",
  fr: "Modifier la transaction",
  en: "Edit transaction",
},

chooseFinancialAccount: {
  pt: "Escolher conta financeira",
  fr: "Choisir un compte financier",
  en: "Choose financial account",
},

save: {
  pt: "Guardar",
  fr: "Enregistrer",
  en: "Save",
},

newFinancialAccount: {
  pt: "Nova conta financeira",
  fr: "Nouveau compte financier",
  en: "New financial account",
},

accountNameExample: {
  pt: "Nome da conta. Ex: Caixa principal",
  fr: "Nom du compte. Ex : Caisse principale",
  en: "Account name. Ex: Main cash register",
},

initialBalance: {
  pt: "Saldo inicial",
  fr: "Solde initial",
  en: "Initial balance",
},

currencyExample: {
  pt: "Moeda. Ex: AOA",
  fr: "Devise. Ex : AOA",
  en: "Currency. Ex: AOA",
},

setAsMainAccount: {
  pt: "Definir como conta principal",
  fr: "Définir comme compte principal",
  en: "Set as main account",
},

createAccount: {
  pt: "Criar conta",
  fr: "Créer le compte",
  en: "Create account",
},

transactionDetails: {
  pt: "Detalhes da transação",
  fr: "Détails de la transaction",
  en: "Transaction details",
},

deleteTransactionQuestion: {
  pt: "Apagar transação?",
  fr: "Supprimer la transaction ?",
  en: "Delete transaction?",
},

deleteTransactionConfirm: {
  pt: "Desejas apagar esta transação de",
  fr: "Voulez-vous supprimer cette transaction de",
  en: "Do you want to delete this transaction of",
},

onlyManualTransactionsCanBeDeleted: {
  pt: "Só é possível apagar transações manuais.",
  fr: "Seules les transactions manuelles peuvent être supprimées.",
  en: "Only manual transactions can be deleted.",
},

financeLoadError: {
  pt: "Erro ao carregar finanças.",
  fr: "Erreur lors du chargement des finances.",
  en: "Error loading finances.",
},

transactionSaveError: {
  pt: "Erro ao guardar transação.",
  fr: "Erreur lors de l’enregistrement de la transaction.",
  en: "Error saving transaction.",
},

transactionSavedSuccess: {
  pt: "Transação guardada com sucesso.",
  fr: "Transaction enregistrée avec succès.",
  en: "Transaction saved successfully.",
},

accountCreateError: {
  pt: "Erro ao criar conta.",
  fr: "Erreur lors de la création du compte.",
  en: "Error creating account.",
},

financialAccountCreatedSuccess: {
  pt: "Conta financeira criada com sucesso.",
  fr: "Compte financier créé avec succès.",
  en: "Financial account created successfully.",
},

transactionDeleteError: {
  pt: "Erro ao apagar transação.",
  fr: "Erreur lors de la suppression de la transaction.",
  en: "Error deleting transaction.",
},

transactionDeletedSuccess: {
  pt: "Transação apagada com sucesso.",
  fr: "Transaction supprimée avec succès.",
  en: "Transaction deleted successfully.",
},

manual: {
  pt: "Manual",
  fr: "Manuel",
  en: "Manual",
},

manualPlural: {
  pt: "Manuais",
  fr: "Manuels",
  en: "Manual",
},

sale: {
  pt: "Venda",
  fr: "Vente",
  en: "Sale",
},

Salary: {
  pt: "Salário",
  fr: "Salaire",
  en: "Salary",
},

salaries: {
  pt: "Salários",
  fr: "Salaires",
  en: "Salaries",
},

origin: {
  pt: "Origem",
  fr: "Origine",
  en: "Origin",
},

cashRegister: {
  pt: "Caixa",
  fr: "Caisse",
  en: "Cash register",
},

bank: {
  pt: "Banco",
  fr: "Banque",
  en: "Bank",
},

mobileMoney: {
  pt: "Mobile Money",
  fr: "Mobile Money",
  en: "Mobile Money",
},

other: {
  pt: "Outro",
  fr: "Autre",
  en: "Other",
},

  allCantinas: {
  pt: "Todas as Cantinas",
  fr: "Toutes les cantines",
  en: "All canteens",
},

cantinasDescription: {
  pt: "Cria, acompanha e administra os pontos de venda.",
  fr: "Créez, suivez et administrez les points de vente.",
  en: "Create, monitor and manage sales points.",
},

compare: {
  pt: "Comparar",
  fr: "Comparer",
  en: "Compare",
},

createCantina: {
  pt: "Criar cantina",
  fr: "Créer une cantine",
  en: "Create canteen",
},

activePlural: {
  pt: "Ativas",
  fr: "Actives",
  en: "Active",
},

inactivePlural: {
  pt: "Inativas",
  fr: "Inactives",
  en: "Inactive",
},

loadingCantinas: {
  pt: "Carregando cantinas...",
  fr: "Chargement des cantines...",
  en: "Loading canteens...",
},

noCantinaCreated: {
  pt: "Nenhuma cantina criada",
  fr: "Aucune cantine créée",
  en: "No canteen created",
},

createFirstCantinaHint: {
  pt: "Clique em “Criar cantina” para criar o primeiro ponto de venda.",
  fr: "Cliquez sur “Créer une cantine” pour créer le premier point de vente.",
  en: "Click “Create canteen” to create the first sales point.",
},

createFirstCantina: {
  pt: "Criar primeira cantina",
  fr: "Créer la première cantine",
  en: "Create first canteen",
},

edit: {
  pt: "Editar",
  fr: "Modifier",
  en: "Edit",
},

activateDeactivate: {
  pt: "Ativar/Inativar",
  fr: "Activer/Désactiver",
  en: "Activate/Deactivate",
},

deletePermanently: {
  pt: "Apagar definitivamente",
  fr: "Supprimer définitivement",
  en: "Delete permanently",
},

cantinaName: {
  pt: "Nome da cantina",
  fr: "Nom de la cantine",
  en: "Canteen name",
},

internalCodeExample: {
  pt: "Código interno. Ex: 001",
  fr: "Code interne. Ex : 001",
  en: "Internal code. Ex: 001",
},

openingCash: {
  pt: "Caixa inicial",
  fr: "Caisse initiale",
  en: "Opening cash",
},

availableMachines: {
  pt: "Máquinas disponíveis",
  fr: "Machines disponibles",
  en: "Available machines",
},

cantinaPassword: {
  pt: "Senha da cantina",
  fr: "Mot de passe de la cantine",
  en: "Canteen password",
},

editCantina: {
  pt: "Editar cantina",
  fr: "Modifier la cantine",
  en: "Edit canteen",
},

deletePermanentlyQuestion: {
  pt: "Apagar definitivamente?",
  fr: "Supprimer définitivement ?",
  en: "Delete permanently?",
},

deleteCantinaConfirm: {
  pt: "Esta ação vai apagar a cantina",
  fr: "Cette action supprimera la cantine",
  en: "This action will delete the canteen",
},

andAccessAccount: {
  pt: "e a sua conta de acesso",
  fr: "et son compte d’accès",
  en: "and its access account",
},

actionCannotBeUndone: {
  pt: "Atenção: esta ação não pode ser anulada.",
  fr: "Attention : cette action ne peut pas être annulée.",
  en: "Warning: this action cannot be undone.",
},

cantinaLoadError: {
  pt: "Erro ao carregar cantinas.",
  fr: "Erreur lors du chargement des cantines.",
  en: "Error loading canteens.",
},

cantinaNameRequired: {
  pt: "O nome da cantina é obrigatório.",
  fr: "Le nom de la cantine est obligatoire.",
  en: "Canteen name is required.",
},

cantinaCodeRequired: {
  pt: "O código da cantina é obrigatório.",
  fr: "Le code de la cantine est obligatoire.",
  en: "Canteen code is required.",
},

cantinaIdentifierNotGenerated: {
  pt: "A identificação da cantina não foi gerada.",
  fr: "L’identifiant de la cantine n’a pas été généré.",
  en: "Canteen identifier was not generated.",
},

cantinaPasswordRequired: {
  pt: "A senha da cantina é obrigatória.",
  fr: "Le mot de passe de la cantine est obligatoire.",
  en: "Canteen password is required.",
},

cantinaCreateError: {
  pt: "Erro ao criar cantina.",
  fr: "Erreur lors de la création de la cantine.",
  en: "Error creating canteen.",
},

cantinaStatusError: {
  pt: "Erro ao alterar status da cantina.",
  fr: "Erreur lors du changement de statut de la cantine.",
  en: "Error changing canteen status.",
},

cantinaEditError: {
  pt: "Erro ao editar cantina.",
  fr: "Erreur lors de la modification de la cantine.",
  en: "Error editing canteen.",
},

cantinaDeleteError: {
  pt: "Erro ao apagar cantina.",
  fr: "Erreur lors de la suppression de la cantine.",
  en: "Error deleting canteen.",
},

  performanceComparison: {
  pt: "Comparação de Performance",
  fr: "Comparaison de performance",
  en: "Performance comparison",
},

performanceComparisonDescription: {
  pt: "Comparação baseada apenas nos dados reais registados no ERP.",
  fr: "Comparaison basée uniquement sur les données réelles enregistrées dans l’ERP.",
  en: "Comparison based only on real data recorded in the ERP.",
},

top3Sales: {
  pt: "Top 3 vendas",
  fr: "Top 3 ventes",
  en: "Top 3 sales",
},

top3SalesDescription: {
  pt: "Compara as 3 melhores cantinas em vendas reais.",
  fr: "Compare les 3 meilleures cantines en ventes réelles.",
  en: "Compare the top 3 canteens by real sales.",
},

allCantinasComparisonDescription: {
  pt: "Compara toda a rede da empresa.",
  fr: "Compare tout le réseau de l’entreprise.",
  en: "Compare the entire company network.",
},

manualChoice: {
  pt: "Escolha manual",
  fr: "Choix manuel",
  en: "Manual choice",
},

manualChoiceDescription: {
  pt: "Seleciona as cantinas a comparar.",
  fr: "Sélectionne les cantines à comparer.",
  en: "Select the canteens to compare.",
},

compareSelected: {
  pt: "Comparar selecionadas",
  fr: "Comparer la sélection",
  en: "Compare selected",
},

chart: {
  pt: "Gráfico",
  fr: "Graphique",
  en: "Chart",
},

byDay: {
  pt: "Por dia",
  fr: "Par jour",
  en: "By day",
},

barChart: {
  pt: "Barras",
  fr: "Barres",
  en: "Bars",
},

lineChart: {
  pt: "Linhas",
  fr: "Lignes",
  en: "Lines",
},

areaChart: {
  pt: "Área",
  fr: "Aire",
  en: "Area",
},

cantinasCount: {
  pt: "cantina(s)",
  fr: "cantine(s)",
  en: "canteen(s)",
},

noCantinaSelectedForComparison: {
  pt: "Nenhuma cantina selecionada para comparação.",
  fr: "Aucune cantine sélectionnée pour la comparaison.",
  en: "No canteen selected for comparison.",
},

grossProfit: {
  pt: "Lucro bruto",
  fr: "Bénéfice brut",
  en: "Gross profit",
},

  backToCantinas: {
  pt: "Voltar para cantinas",
  fr: "Retour aux cantines",
  en: "Back to canteens",
},
overview: {
  pt: "Visão geral",
  fr: "Vue d’ensemble",
  en: "Overview",
},
dailyTracking: {
  pt: "Suivi diário",
  fr: "Suivi quotidien",
  en: "Daily tracking",
},
monthlyTracking: {
  pt: "Suivi mensal",
  fr: "Suivi mensuel",
  en: "Monthly tracking",
},
report: {
  pt: "Relatório",
  fr: "Rapport",
  en: "Report",
},
noLocation: {
  pt: "Sem localização",
  fr: "Sans localisation",
  en: "No location",
},
stockTransactions: {
  pt: "Transações de stock",
  fr: "Transactions de stock",
  en: "Stock transactions",
},
totalSold: {
  pt: "Total vendido",
  fr: "Total vendu",
  en: "Total sold",
},
estimatedProfit: {
  pt: "Lucro estimado",
  fr: "Bénéfice estimé",
  en: "Estimated profit",
},
top5Products: {
  pt: "Top 5 produtos",
  fr: "Top 5 produits",
  en: "Top 5 products",
},
unknownProduct: {
  pt: "Produto desconhecido",
  fr: "Produit inconnu",
  en: "Unknown product",
},
noProductSoldYet: {
  pt: "Nenhum produto vendido ainda.",
  fr: "Aucun produit vendu pour le moment.",
  en: "No product sold yet.",
},
noStockProduct: {
  pt: "Nenhum produto em stock.",
  fr: "Aucun produit en stock.",
  en: "No product in stock.",
},
noCostRecorded: {
  pt: "Nenhum custo registado.",
  fr: "Aucun coût enregistré.",
  en: "No cost recorded.",
},
cost: {
  pt: "Custo",
  fr: "Coût",
  en: "Cost",
},
noEmployeeLinked: {
  pt: "Nenhum funcionário ligado.",
  fr: "Aucun employé lié.",
  en: "No employee linked.",
},
salesReportByInterval: {
  pt: "Relatório de vendas por intervalo",
  fr: "Rapport de ventes par intervalle",
  en: "Sales report by interval",
},
startDate: {
  pt: "Data de princípio",
  fr: "Date de début",
  en: "Start date",
},
endDate: {
  pt: "Data de fim",
  fr: "Date de fin",
  en: "End date",
},
noSaleFoundInPeriod: {
  pt: "Nenhuma venda encontrada no período escolhido.",
  fr: "Aucune vente trouvée dans la période choisie.",
  en: "No sale found in the selected period.",
},
hour: {
  pt: "Hora",
  fr: "Heure",
  en: "Hour",
},
method: {
  pt: "Método",
  fr: "Méthode",
  en: "Method",
},
days: {
  pt: "Dias",
  fr: "Jours",
  en: "Days",
},
day: {
  pt: "Dia",
  fr: "Jour",
  en: "Day",
},
month: {
  pt: "Mês",
  fr: "Mois",
  en: "Month",
},
max: {
  pt: "Máx",
  fr: "Max",
  en: "Max",
},
min: {
  pt: "Mín",
  fr: "Min",
  en: "Min",
},
average: {
  pt: "Média",
  fr: "Moyenne",
  en: "Average",
},
numberOfSales: {
  pt: "Nº vendas",
  fr: "Nº ventes",
  en: "No. sales",
},
growth: {
  pt: "Crescimento",
  fr: "Croissance",
  en: "Growth",
},
monthlyReport: {
  pt: "Relatório mensal",
  fr: "Rapport mensuel",
  en: "Monthly report",
},
stockTransactionsDescription: {
  pt: "Histórico de entradas, saídas, ajustes e stock atual da cantina.",
  fr: "Historique des entrées, sorties, ajustements et stock actuel de la cantine.",
  en: "History of entries, exits, adjustments and current canteen stock.",
},
noStockTransactionFound: {
  pt: "Nenhuma transação de stock encontrada.",
  fr: "Aucune transaction de stock trouvée.",
  en: "No stock transaction found.",
},
stockIn: {
  pt: "Entrada",
  fr: "Entrée",
  en: "In",
},
stockOut: {
  pt: "Saída",
  fr: "Sortie",
  en: "Out",
},
reason: {
  pt: "Motivo",
  fr: "Motif",
  en: "Reason",
},
user: {
  pt: "Utilizador",
  fr: "Utilisateur",
  en: "User",
},
loadingCantinaDetails: {
  pt: "Carregando detalhes da cantina...",
  fr: "Chargement des détails de la cantine...",
  en: "Loading canteen details...",
},
cantinaNotFound: {
  pt: "Cantina não encontrada.",
  fr: "Cantine introuvable.",
  en: "Canteen not found.",
},

  salesManagement:{pt:"Gestão de Vendas",fr:"Gestion des ventes",en:"Sales management"},
posConnectedToStock:{pt:"POS ligado ao stock da cantina",fr:"POS connecté au stock de la cantine",en:"POS connected to canteen stock"},
chooseCantina:{pt:"Escolher cantina",fr:"Choisir une cantine",en:"Choose canteen"},
newSale:{pt:"Nova venda",fr:"Nouvelle vente",en:"New sale"},
back:{pt:"Voltar",fr:"Retour",en:"Back"},
Report:{pt:"Relatório",fr:"Rapport",en:"Report"},
price:{pt:"Preço",fr:"Prix",en:"Price"},
noItemsAdded:{pt:"Nenhum item adicionado.",fr:"Aucun article ajouté.",en:"No items added."},
codeOrBarcode:{pt:"Código ou barcode",fr:"Code ou code-barres",en:"Code or barcode"},
searchProduct:{pt:"Procurar produto",fr:"Rechercher un produit",en:"Search product"},
currentSale:{pt:"Venda atual",fr:"Vente actuelle",en:"Current sale"},
noItemAdded:{pt:"Nenhum item adicionado.",fr:"Aucun article ajouté.",en:"No item added"},
continueSale:{pt:"Continuar venda",fr:"Continuer la vente",en:"Continue sale"},
removeItem:{pt:"Remover item",fr:"Retirer l’article",en:"Remove item"},
saleSummary:{pt:"Resumo da venda",fr:"Résumé de la vente",en:"Sale summary"},
totalDiscountCustomer:{pt:"Total, desconto e cliente",fr:"Total, remise et client",en:"Total, discount and customer"},
discount:{pt:"Desconto",fr:"Remise",en:"Discount"},
customerName:{pt:"Nome do cliente",fr:"Nom du client",en:"Customer name"},
choosePaymentMethod:{pt:"Escolher tipo de pagamento",fr:"Choisir le mode de paiement",en:"Choose payment method"},
saleTotal:{pt:"Total da venda",fr:"Total de la vente",en:"Sale total"},
cash:{pt:"Dinheiro",fr:"Espèces",en:"Cash"},
card:{pt:"Cartão",fr:"Carte",en:"Card"},
transfer:{pt:"Transferência",fr:"Virement",en:"Transfer"},
cashPayment:{pt:"Pagamento em dinheiro",fr:"Paiement en espèces",en:"Cash payment"},
enterCustomerAmount:{pt:"Introduz o valor recebido do cliente.",fr:"Saisissez le montant reçu du client.",en:"Enter amount received from customer."},
customerPays:{pt:"Cliente paga",fr:"Le client paie",en:"Customer pays"},
change:{pt:"Troco",fr:"Monnaie",en:"Change"},
validating:{pt:"Validando...",fr:"Validation...",en:"Validating..."},
validatePayment:{pt:"Validar pagamento",fr:"Valider le paiement",en:"Validate payment"},
saleCompleted:{pt:"Venda concluída",fr:"Vente terminée",en:"Sale completed"},
wantInvoice:{pt:"Desejas emitir a factura desta venda?",fr:"Voulez-vous émettre la facture de cette vente ?",en:"Do you want to issue the invoice for this sale?"},
dontIssue:{pt:"Não emitir",fr:"Ne pas émettre",en:"Do not issue"},
issueInvoice:{pt:"Emitir factura",fr:"Émettre la facture",en:"Issue invoice"},
salesHistory:{pt:"Histórico de vendas",fr:"Historique des ventes",en:"Sales history"},
saleNumber:{pt:"Nº Venda",fr:"N° Vente",en:"Sale No"},
noSalesFound:{pt:"Nenhuma venda encontrada.",fr:"Aucune vente trouvée.",en:"No sales found"},
previous:{pt:"Anterior",fr:"Précédent",en:"Previous"},
next:{pt:"Seguinte",fr:"Suivant",en:"Next"},
errorLoadingProducts:{pt:"Erro ao carregar produtos.",fr:"Erreur lors du chargement des produits.",en:"Error loading products."},
quantityHigherThanStock:{pt:"Quantidade superior ao stock disponível.",fr:"Quantité supérieure au stock disponible.",en:"Quantity exceeds available stock."},
productNotFoundCantina:{pt:"Produto inexistente nesta cantina.",fr:"Produit inexistant dans cette cantine.",en:"Product not found in this canteen."},
chooseCantinaBeforeSelling:{pt:"Escolha uma cantina antes de vender.",fr:"Choisissez une cantine avant de vendre.",en:"Choose a canteen before selling."},
paidAmountLowerThanTotal:{pt:"O valor pago é inferior ao total.",fr:"Le montant payé est inférieur au total.",en:"Paid amount is lower than total."},
errorFinishingSale:{pt:"Erro ao finalizar venda.",fr:"Erreur lors de la finalisation de la vente.",en:"Error finishing sale."},
offlineSaleSaved:{pt:"Venda guardada offline. Será sincronizada quando houver internet.",fr:"Vente enregistrée hors ligne. Elle sera synchronisée lorsque Internet sera disponible.",en:"Sale saved offline. It will sync when internet is available."},
saleRegisteredSuccess:{pt:"Venda registada com sucesso.",fr:"Vente enregistrée avec succès.",en:"Sale registered successfully."},
offlineSalesSynced:{pt:"Vendas offline sincronizadas com sucesso.",fr:"Ventes hors ligne synchronisées avec succès.",en:"Offline sales synced successfully."},
saleFinishedWithoutInvoice:{pt:"Venda finalizada sem factura.",fr:"Vente terminée sans facture.",en:"Sale completed without invoice."},
invoiceWillBeGenerated:{pt:"Factura será gerada.",fr:"La facture sera générée.",en:"Invoice will be generated."},

  costLoadError: { pt: "Erro ao carregar custos.", fr: "Erreur lors du chargement des coûts.", en: "Error loading costs." },
paymentOf: { pt: "Pagamento de", fr: "Paiement de", en: "Payment of" },
payCostError: { pt: "Erro ao pagar custo.", fr: "Erreur lors du paiement du coût.", en: "Error paying cost." },
costPaidSuccess: { pt: "Custo pago com sucesso.", fr: "Coût payé avec succès.", en: "Cost paid successfully." },
deleteCostError: { pt: "Erro ao apagar custo.", fr: "Erreur lors de la suppression du coût.", en: "Error deleting cost." },
costDeletedSuccess: { pt: "Custo apagado com sucesso.", fr: "Coût supprimé avec succès.", en: "Cost deleted successfully." },
saveCategoryError: { pt: "Erro ao guardar categoria.", fr: "Erreur lors de l’enregistrement de la catégorie.", en: "Error saving category." },
categorySavedSuccess: { pt: "Categoria guardada com sucesso.", fr: "Catégorie enregistrée avec succès.", en: "Category saved successfully." },
deleteCategoryError: { pt: "Erro ao apagar categoria.", fr: "Erreur lors de la suppression de la catégorie.", en: "Error deleting category." },
categoryDeletedSuccess: { pt: "Categoria apagada com sucesso.", fr: "Catégorie supprimée avec succès.", en: "Category deleted successfully." },

costManagement: { pt: "Gestão de Custos", fr: "Gestion des coûts", en: "Cost management" },
costManagementDescription: { pt: "Categorias de custos, pagamentos reais, custos por cantina e custos gerais.", fr: "Catégories de coûts, paiements réels, coûts par cantine et coûts généraux.", en: "Cost categories, real payments, canteen costs and general costs." },
totalPaid: { pt: "Total pago", fr: "Total payé", en: "Total paid" },
payments: { pt: "Pagamentos", fr: "Paiements", en: "Payments" },
searchCosts: { pt: "Pesquisar custo, categoria, cantina ou período...", fr: "Rechercher coût, catégorie, cantine ou période...", en: "Search cost, category, canteen or period..." },
allCategories: { pt: "Todas categorias", fr: "Toutes catégories", en: "All categories" },
allTypes: { pt: "Todos tipos", fr: "Tous les types", en: "All types" },
allPeriodicities: { pt: "Todas periodicidades", fr: "Toutes les périodicités", en: "All periodicities" },
allApplications: { pt: "Todas aplicações", fr: "Toutes les applications", en: "All applications" },
application: { pt: "Aplicação", fr: "Application", en: "Application" },
period: { pt: "Período", fr: "Période", en: "Period" },
account: { pt: "Conta", fr: "Compte", en: "Account" },
actions: { pt: "Ações", fr: "Actions", en: "Actions" },
noPayments: { pt: "Nenhum pagamento registado.", fr: "Aucun paiement enregistré.", en: "No payments recorded." },
loadingCosts: { pt: "Carregando custos...", fr: "Chargement des coûts...", en: "Loading costs..." },

quarterly: { pt: "Trimestral", fr: "Trimestriel", en: "Quarterly" },
notRecurring: { pt: "Não periódico", fr: "Non périodique", en: "Non recurring" },
periodicity: { pt: "Periodicidade", fr: "Périodicité", en: "Periodicity" },
defaultAmount: { pt: "Valor padrão", fr: "Montant par défaut", en: "Default amount" },

payCost: { pt: "Pagar custo", fr: "Payer un coût", en: "Pay cost" },
whatDoYouWantToPay: { pt: "O que quer pagar?", fr: "Que voulez-vous payer ?", en: "What do you want to pay?" },
chooseCategory: { pt: "Escolher categoria", fr: "Choisir une catégorie", en: "Choose category" },
realPaidAmount: { pt: "Valor real pago", fr: "Montant réel payé", en: "Real paid amount" },
companyGeneral: { pt: "Geral da empresa", fr: "Général de l’entreprise", en: "Company general" },
financialAccount: { pt: "Conta financeira", fr: "Compte financier", en: "Financial account" },
chooseAccount: { pt: "Escolher conta", fr: "Choisir un compte", en: "Choose account" },
paymentDate: { pt: "Data do pagamento", fr: "Date du paiement", en: "Payment date" },
referencePeriod: { pt: "Período de referência", fr: "Période de référence", en: "Reference period" },
referencePeriodExample: { pt: "Ex: Maio 2026", fr: "Ex : Mai 2026", en: "Ex: May 2026" },
note: { pt: "Observação", fr: "Observation", en: "Note" },
paymentNoteExample: { pt: "Ex: pagamento de energia da cantina 001...", fr: "Ex : paiement d’énergie de la cantine 001...", en: "Ex: energy payment for canteen 001..." },
paying: { pt: "Pagando...", fr: "Paiement...", en: "Paying..." },
confirmPayment: { pt: "Confirmar pagamento", fr: "Confirmer le paiement", en: "Confirm payment" },

costCategories: { pt: "Categorias de custos", fr: "Catégories de coûts", en: "Cost categories" },
costCategoriesDescription: { pt: "Define os custos que podem ser pagos: renda, energia, água, internet, transporte e outros.", fr: "Définissez les coûts pouvant être payés : loyer, énergie, eau, internet, transport et autres.", en: "Define payable costs: rent, energy, water, internet, transport and others." },
editCategory: { pt: "Editar categoria", fr: "Modifier la catégorie", en: "Edit category" },
newCategory: { pt: "Nova categoria", fr: "Nouvelle catégorie", en: "New category" },
clear: { pt: "Limpar", fr: "Effacer", en: "Clear" },
categoryNameExample: { pt: "Nome. Ex: Renda, Energia, Água", fr: "Nom. Ex : Loyer, Énergie, Eau", en: "Name. Ex: Rent, Energy, Water" },
oneTimeNonRecurring: { pt: "Pontual / não periódico", fr: "Ponctuel / non périodique", en: "One-time / non recurring" },
withoutPeriodicity: { pt: "Sem periodicidade", fr: "Sans périodicité", en: "Without periodicity" },
optionalDefaultAmount: { pt: "Valor padrão opcional", fr: "Montant par défaut optionnel", en: "Optional default amount" },
createCategory: { pt: "Criar categoria", fr: "Créer une catégorie", en: "Create category" },

paymentDetails: { pt: "Detalhes do pagamento", fr: "Détails du paiement", en: "Payment details" },
deletePayment: { pt: "Apagar pagamento", fr: "Supprimer le paiement", en: "Delete payment" },
deletePaymentQuestion: { pt: "Apagar pagamento?", fr: "Supprimer le paiement ?", en: "Delete payment?" },
deletePaymentConfirm: { pt: "Desejas apagar este pagamento de", fr: "Voulez-vous supprimer ce paiement de", en: "Do you want to delete this payment of" },
financialBalanceRestored: { pt: "O saldo da conta financeira será reposto.", fr: "Le solde du compte financier sera restauré.", en: "The financial account balance will be restored." },
DeleteCategoryQuestion: { pt: "Apagar categoria?", fr: "Supprimer la catégorie ?", en: "Delete category?" },
deleteCategoryConfirm: { pt: "Desejas apagar a categoria", fr: "Voulez-vous supprimer la catégorie", en: "Do you want to delete the category" },
deleteCategoryWarning: { pt: "Só é possível apagar categorias sem custos associados.", fr: "Il est seulement possible de supprimer les catégories sans coûts associés.", en: "Only categories without associated costs can be deleted." },

  purchaseManagement: {
  pt: "Gestão de Compras",
  fr: "Gestion des achats",
  en: "Purchase management",
},
purchaseManagementDescription: {
  pt: "Registo de entradas de mercadoria, fornecedores e atualização do stock central.",
  fr: "Enregistrement des entrées de marchandises, fournisseurs et mise à jour du stock central.",
  en: "Goods entries, suppliers and central stock update.",
},
newPurchase: {
  pt: "Nova compra",
  fr: "Nouvel achat",
  en: "New purchase",
},
Purchase: {
  pt: "Compra",
  fr: "Achat",
  en: "Purchase",
},
received: {
  pt: "Recebida",
  fr: "Reçue",
  en: "Received",
},
receivedPlural: {
  pt: "Recebidas",
  fr: "Reçues",
  en: "Received",
},
pending: {
  pt: "Pendente",
  fr: "En attente",
  en: "Pending",
},
pendingPlural: {
  pt: "Pendentes",
  fr: "En attente",
  en: "Pending",
},
cancelled: {
  pt: "Cancelada",
  fr: "Annulée",
  en: "Cancelled",
},
totalValue: {
  pt: "Valor total",
  fr: "Valeur totale",
  en: "Total value",
},
searchPurchase: {
  pt: "Pesquisar por nº compra, fatura ou fornecedor...",
  fr: "Rechercher par n° d’achat, facture ou fournisseur...",
  en: "Search by purchase no., invoice or supplier...",
},
loadingPurchases: {
  pt: "Carregando compras...",
  fr: "Chargement des achats...",
  en: "Loading purchases...",
},
Invoice: {
  pt: "Fatura",
  fr: "Facture",
  en: "Invoice",
},
items: {
  pt: "Itens",
  fr: "Articles",
  en: "Items",
},
viewDetails: {
  pt: "Ver detalhes",
  fr: "Voir les détails",
  en: "View details",
},
editPurchase: {
  pt: "Editar compra",
  fr: "Modifier l’achat",
  en: "Edit purchase",
},
changeStatus: {
  pt: "Alterar status",
  fr: "Changer le statut",
  en: "Change status",
},
deletePurchase: {
  pt: "Apagar compra",
  fr: "Supprimer l’achat",
  en: "Delete purchase",
},
newPurchaseDescription: {
  pt: "Regista uma compra e atualiza automaticamente o stock central.",
  fr: "Enregistre un achat et met automatiquement à jour le stock central.",
  en: "Register a purchase and automatically update central stock.",
},
InvoiceNumber: {
  pt: "Nº da fatura",
  fr: "N° de facture",
  en: "Invoice number",
},
transportCost: {
  pt: "Custo de transporte",
  fr: "Coût de transport",
  en: "Transport cost",
},
otherCosts: {
  pt: "Outros custos",
  fr: "Autres coûts",
  en: "Other costs",
},
receivedNow: {
  pt: "Recebida agora",
  fr: "Reçue maintenant",
  en: "Received now",
},
notes: {
  pt: "Notas",
  fr: "Notes",
  en: "Notes",
},
subtotal: {
  pt: "Subtotal",
  fr: "Sous-total",
  en: "Subtotal",
},
registering: {
  pt: "Registando...",
  fr: "Enregistrement...",
  en: "Registering...",
},
registerPurchase: {
  pt: "Registar compra",
  fr: "Enregistrer l’achat",
  en: "Register purchase",
},
searchProductNameCodeBarcode: {
  pt: "Pesquisar produto por nome, código ou barcode...",
  fr: "Rechercher un produit par nom, code ou code-barres...",
  en: "Search product by name, code or barcode...",
},
currentStock: {
  pt: "Stock atual",
  fr: "Stock actuel",
  en: "Current stock",
},
unitCost: {
  pt: "Custo unitário",
  fr: "Coût unitaire",
  en: "Unit cost",
},
noProductAdded: {
  pt: "Nenhum produto adicionado.",
  fr: "Aucun produit ajouté.",
  en: "No product added.",
},
searchProductToAdd: {
  pt: "Pesquise um produto acima e clique para adicionar à compra.",
  fr: "Recherchez un produit ci-dessus et cliquez pour l’ajouter à l’achat.",
  en: "Search for a product above and click to add it to the purchase.",
},
saveChanges: {
  pt: "Guardar alterações",
  fr: "Enregistrer les modifications",
  en: "Save changes",
},
saving: {
  pt: "Guardando...",
  fr: "Enregistrement...",
  en: "Saving...",
},
receivedStockWarning: {
  pt: "Atenção: ao mudar para “Recebida”, o stock central será atualizado automaticamente.",
  fr: "Attention : en passant à “Reçue”, le stock central sera mis à jour automatiquement.",
  en: "Warning: when changing to “Received”, central stock will be updated automatically.",
},
deletePurchaseQuestion: {
  pt: "Apagar compra?",
  fr: "Supprimer l’achat ?",
  en: "Delete purchase?",
},
deletePurchaseConfirm: {
  pt: "Desejas apagar a compra",
  fr: "Voulez-vous supprimer l’achat",
  en: "Do you want to delete purchase",
},
deletePurchaseWarning: {
  pt: "Esta ação só é permitida para compras pendentes ou canceladas.",
  fr: "Cette action n’est autorisée que pour les achats en attente ou annulés.",
  en: "This action is only allowed for pending or cancelled purchases.",
},
deleting: {
  pt: "Apagando...",
  fr: "Suppression...",
  en: "Deleting...",
},
addAtLeastOneProduct: {
  pt: "Adicione pelo menos um produto.",
  fr: "Ajoutez au moins un produit.",
  en: "Add at least one product.",
},
purchaseLoadError: {
  pt: "Erro ao carregar compras.",
  fr: "Erreur lors du chargement des achats.",
  en: "Error loading purchases.",
},
purchaseCreateError: {
  pt: "Erro ao registar compra.",
  fr: "Erreur lors de l’enregistrement de l’achat.",
  en: "Error registering purchase.",
},
purchaseCreated: {
  pt: "Compra registada com sucesso.",
  fr: "Achat enregistré avec succès.",
  en: "Purchase registered successfully.",
},
purchaseUpdateError: {
  pt: "Erro ao editar compra.",
  fr: "Erreur lors de la modification de l’achat.",
  en: "Error editing purchase.",
},
purchaseUpdated: {
  pt: "Compra atualizada com sucesso.",
  fr: "Achat mis à jour avec succès.",
  en: "Purchase updated successfully.",
},
purchaseDeleteError: {
  pt: "Erro ao apagar compra.",
  fr: "Erreur lors de la suppression de l’achat.",
  en: "Error deleting purchase.",
},
purchaseDeleted: {
  pt: "Compra apagada com sucesso.",
  fr: "Achat supprimé avec succès.",
  en: "Purchase deleted successfully.",
},
statusUpdateError: {
  pt: "Erro ao alterar status.",
  fr: "Erreur lors du changement de statut.",
  en: "Error changing status.",
},
statusUpdated: {
  pt: "Status atualizado com sucesso.",
  fr: "Statut mis à jour avec succès.",
  en: "Status updated successfully.",
},
  intelligentStockDescription: {
  pt: "FIFO, valor do stock e lucro potencial das mercadorias.",
  fr: "FIFO, valeur du stock et bénéfice potentiel des marchandises.",
  en: "FIFO, stock value and potential profit of goods.",
},

potentialRevenue: {
  pt: "Receita potencial",
  fr: "Revenu potentiel",
  en: "Potential revenue",
},

potentialMargin: {
  pt: "Margem potencial",
  fr: "Marge potentielle",
  en: "Potential margin",
},

searchProductCodeCantina: {
  pt: "Pesquisar produto, código ou cantina...",
  fr: "Rechercher produit, code ou cantine...",
  en: "Search product, code or canteen...",
},

loadingIntelligentStock: {
  pt: "Carregando stock inteligente...",
  fr: "Chargement du stock intelligent...",
  en: "Loading smart stock...",
},

noFifoBatch: {
  pt: "Nenhum lote FIFO encontrado.",
  fr: "Aucun lot FIFO trouvé.",
  en: "No FIFO batch found.",
},

location: {
  pt: "Local",
  fr: "Lieu",
  en: "Location",
},

qty: {
  pt: "Qtd",
  fr: "Qté",
  en: "Qty",
},

fifoCost: {
  pt: "Custo FIFO",
  fr: "Coût FIFO",
  en: "FIFO cost",
},

Margin: {
  pt: "Margem",
  fr: "Marge",
  en: "Margin",
},
  reportsDescription: {
  pt: "Central de análise: vendas, compras, stock, custos, finanças, RH, lucros e cantinas.",
  fr: "Centre d’analyse : ventes, achats, stock, coûts, finances, RH, bénéfices et cantines.",
  en: "Analysis center: sales, purchases, stock, costs, finance, HR, profits and canteens.",
},
cantinaStock: {
  pt: "Stock da cantina",
  fr: "Stock de la cantine",
  en: "Canteen stock",
},

totalTransferred: {
  pt: "Quantidade total transferida",
  fr: "Quantité totale transférée",
  en: "Total quantity transferred",
},

remainingQuantity: {
  pt: "Quantidade restante",
  fr: "Quantité restante",
  en: "Remaining quantity",
},

export: {
  pt: "Exportar",
  fr: "Exporter",
  en: "Export",
},

income: {
  pt: "Entradas",
  fr: "Entrées",
  en: "Income",
},

expenses: {
  pt: "Saídas",
  fr: "Sorties",
  en: "Expenses",
},

result: {
  pt: "Resultado",
  fr: "Résultat",
  en: "Result",
},

records: {
  pt: "Registos",
  fr: "Enregistrements",
  en: "Records",
},

from: {
  pt: "De",
  fr: "De",
  en: "From",
},

until: {
  pt: "Até",
  fr: "Jusqu’à",
  en: "Until",
},

all: {
  pt: "Todas",
  fr: "Toutes",
  en: "All",
},

searchReport: {
  pt: "Pesquisar por número, descrição, cantina...",
  fr: "Rechercher par numéro, description, cantine...",
  en: "Search by number, description, canteen...",
},

reportLoadError: {
  pt: "Erro ao carregar relatório.",
  fr: "Erreur lors du chargement du rapport.",
  en: "Error loading report.",
},

reportOf: {
  pt: "Relatório de",
  fr: "Rapport de",
  en: "Report of",
},

AllCantinas: {
  pt: "Todas as cantinas",
  fr: "Toutes les cantines",
  en: "All canteens",
},

noRecords: {
  pt: "Nenhum registo encontrado.",
  fr: "Aucun enregistrement trouvé.",
  en: "No records found.",
},

reference: {
  pt: "Nº / Ref.",
  fr: "N° / Réf.",
  en: "No / Ref.",
},

cantinaAccount: {
  pt: "Cantina / Conta",
  fr: "Cantine / Compte",
  en: "Canteen / Account",
},

methodType: {
  pt: "Método / Tipo",
  fr: "Méthode / Type",
  en: "Method / Type",
},

expense: {
  pt: "Saída",
  fr: "Sortie",
  en: "Expense",
},

status: {
  pt: "Estado",
  fr: "État",
  en: "Status",
},

page: {
  pt: "Página",
  fr: "Page",
  en: "Page",
},

of: {
  pt: "de",
  fr: "de",
  en: "of",
},
  connectNorbee: {

  pt: "Conecte-se à Norbee",

  fr: "Connectez-vous à Norbee",

  en: "Connect to Norbee",

},

register: {

  pt: "Inscrever-se",

  fr: "S’inscrire",

  en: "Register",

},

recoverPassword: {

  pt: "Recuperar palavra-passe",

  fr: "Récupérer le mot de passe",

  en: "Recover password",

},

identifier: {

  pt: "Identificação",

  fr: "Identifiant",

  en: "Identifier",

},

rememberPassword: {

  pt: "Guardar palavra-passe",

  fr: "Mémoriser le mot de passe",

  en: "Remember password",

},

connect: {

  pt: "Conectar",

  fr: "Connexion",

  en: "Connect",

},

connecting: {

  pt: "Entrando...",

  fr: "Connexion...",

  en: "Connecting...",

},

creating: {

  pt: "Criando...",

  fr: "Création...",

  en: "Creating...",

},

updating: {

  pt: "Atualizando...",

  fr: "Mise à jour...",

  en: "Updating...",

},

changePassword: {

  pt: "Alterar palavra-passe",

  fr: "Changer le mot de passe",

  en: "Change password",

},

backLogin: {

  pt: "Voltar ao login",

  fr: "Retour à la connexion",

  en: "Back to login",

},

noAccount: {

  pt: "Sem uma conta?",

  fr: "Pas de compte ?",

  en: "No account?",

},

alreadyHaveAccount: {

  pt: "Já tem uma conta?",

  fr: "Vous avez déjà un compte ?",

  en: "Already have an account?",

},

emailOrPhone: {

  pt: "Email ou telefone",

  fr: "Email ou téléphone",

  en: "Email or phone",

},

newPassword: {

  pt: "Nova palavra-passe",

  fr: "Nouveau mot de passe",

  en: "New password",

},

identifierRequired: {

  pt: "Por favor, informe sua identificação.",

  fr: "Veuillez saisir votre identifiant.",

  en: "Please enter your identifier.",

},

passwordRequired: {

  pt: "Por favor, informe sua senha.",

  fr: "Veuillez saisir votre mot de passe.",

  en: "Please enter your password.",

},

companyNameRequired: {

  pt: "Por favor, informe o nome da empresa.",

  fr: "Veuillez saisir le nom de l'entreprise.",

  en: "Please enter the company name.",

},

emailRequired: {

  pt: "Por favor, informe o email ou telefone.",

  fr: "Veuillez saisir l'email ou le téléphone.",

  en: "Please enter email or phone.",

},

passwordMin: {

  pt: "A senha deve conter pelo menos 6 caracteres.",

  fr: "Le mot de passe doit contenir au moins 6 caractères.",

  en: "Password must contain at least 6 characters.",

},

passwordMismatch: {

  pt: "As senhas não correspondem.",

  fr: "Les mots de passe ne correspondent pas.",

  en: "Passwords do not match.",

},

invalidCompanyName: {

  pt: "Nome da empresa inválido.",

  fr: "Nom d'entreprise invalide.",

  en: "Invalid company name.",

},

registerError: {

  pt: "Erro ao se cadastrar.",

  fr: "Erreur lors de l'inscription.",

  en: "Registration error.",

},

invalidIdentifier: {

  pt: "Identificação inválida.",

  fr: "Identifiant invalide.",

  en: "Invalid identifier.",

},

resetError: {

  pt: "Erro ao recuperar a senha.",

  fr: "Erreur lors de la récupération du mot de passe.",

  en: "Password recovery error.",

},

passwordUpdated: {

  pt: "Senha atualizada com sucesso.",

  fr: "Mot de passe mis à jour avec succès.",

  en: "Password updated successfully.",

},

unknownError: {

  pt: "Erro desconhecido.",

  fr: "Erreur inconnue.",

  en: "Unknown error.",

},
  dashboardOverview: {
  pt: "Visão geral da empresa: vendas, stock, lucros, eventos e finanças.",
  fr: "Vue globale de l'entreprise : ventes, stock, bénéfices, événements et finances.",
  en: "Global company overview: sales, stock, profits, events and finance.",
},

salesEvolution: {
  pt: "Evolução das vendas",
  fr: "Évolution des ventes",
  en: "Sales evolution",
},

topMonth: {
  pt: "Top do mês",
  fr: "Top du mois",
  en: "Top of the month",
},

code: {
  pt: "Código",
  fr: "Code",
  en: "Code",
},

noSales: {
  pt: "Nenhuma venda registada.",
  fr: "Aucune vente enregistrée.",
  en: "No sales recorded.",
},

  dashboard: {

    pt: "Dashboard",

    fr: "Tableau de bord",

    en: "Dashboard",

  },

  sales: {

    pt: "Vendas",

    fr: "Ventes",

    en: "Sales",

  },

  cantinas: {

    pt: "Cantinas",

    fr: "Cantines",

    en: "Canteens",

  },

  stock: {

    pt: "Stock",

    fr: "Stock",

    en: "Stock",

  },

  intelligentStock: {

    pt: "Stock Inteligente",

    fr: "Stock Intelligent",

    en: "Smart Stock",

  },

  purchases: {

    pt: "Compras",

    fr: "Achats",

    en: "Purchases",

  },

  costs: {

    pt: "Custos",

    fr: "Coûts",

    en: "Costs",

  },

  profits: {

    pt: "Lucros",

    fr: "Bénéfices",

    en: "Profits",

  },

  finance: {

    pt: "Finanças",

    fr: "Finances",

    en: "Finance",

  },

  hr: {

    pt: "RH",

    fr: "RH",

    en: "HR",

  },

  reports: {

    pt: "Relatórios",

    fr: "Rapports",

    en: "Reports",

  },

  settings: {

    pt: "Configurações",

    fr: "Paramètres",

    en: "Settings",

  },

  search: {

    pt: "Pesquisar página...",

    fr: "Rechercher une page...",

    en: "Search page...",

  },

  notifications: {

    pt: "Notificações",

    fr: "Notifications",

    en: "Notifications",

  },

  unread: {

    pt: "não lida(s)",

    fr: "non lue(s)",

    en: "unread",

  },

  noNotifications: {

    pt: "Nenhuma notificação.",

    fr: "Aucune notification.",

    en: "No notifications.",

  },

  noResult: {

    pt: "Nenhum resultado encontrado.",

    fr: "Aucun résultat trouvé.",

    en: "No result found.",

  },

  Update: {

    pt: "Atualizar",

    fr: "Actualiser",

    en: "Refresh",

  },

  logout: {

    pt: "Terminar sessão",

    fr: "Se déconnecter",

    en: "Log out",

  },

  login: {

    pt: "Entrar",

    fr: "Connexion",

    en: "Login",

  },

  email: {

    pt: "Email",

    fr: "Email",

    en: "Email",

  },

  password: {

    pt: "Palavra-passe",

    fr: "Mot de passe",

    en: "Password",

  },

  confirmPassword: {

    pt: "Confirmar palavra-passe",

    fr: "Confirmer le mot de passe",

    en: "Confirm password",

  },

  CreateAccount: {

    pt: "Criar conta",

    fr: "Créer un compte",

    en: "Create account",

  },

  Company: {

    pt: "Empresa",

    fr: "Entreprise",

    en: "Company",

  },

  Save: {

    pt: "Guardar",

    fr: "Enregistrer",

    en: "Save",

  },

  cancel: {

    pt: "Cancelar",

    fr: "Annuler",

    en: "Cancel",

  },

  delete: {

    pt: "Apagar",

    fr: "Supprimer",

    en: "Delete",

  },

  Edit: {

    pt: "Editar",

    fr: "Modifier",

    en: "Edit",

  },

  Create: {

    pt: "Criar",

    fr: "Créer",

    en: "Create",

  },

  loading: {

    pt: "Carregando...",

    fr: "Chargement...",

    en: "Loading...",

  },

  yes: {

    pt: "Sim",

    fr: "Oui",

    en: "Yes",

  },

  no: {

    pt: "Não",

    fr: "Non",

    en: "No",

  },

  active: {

    pt: "Ativo",

    fr: "Actif",

    en: "Active",

  },

  inactive: {

    pt: "Inativo",

    fr: "Inactif",

    en: "Inactive",

  },

  Status: {

    pt: "Estado",

    fr: "Statut",

    en: "Status",

  },

  amount: {

    pt: "Valor",

    fr: "Montant",

    en: "Amount",

  },

  total: {

    pt: "Total",

    fr: "Total",

    en: "Total",

  },

  date: {

    pt: "Data",

    fr: "Date",

    en: "Date",

  },

  description: {

    pt: "Descrição",

    fr: "Description",

    en: "Description",

  },

  category: {

    pt: "Categoria",

    fr: "Catégorie",

    en: "Category",

  },

  categories: {

    pt: "Categorias",

    fr: "Catégories",

    en: "Categories",

  },

  product: {

    pt: "Produto",

    fr: "Produit",

    en: "Product",

  },

  Products: {

    pt: "Produtos",

    fr: "Produits",

    en: "Products",

  },

  quantity: {

    pt: "Quantidade",

    fr: "Quantité",

    en: "Quantity",

  },

  unitPrice: {

    pt: "Preço unitário",

    fr: "Prix unitaire",

    en: "Unit price",

  },

  PurchasePrice: {

    pt: "Preço de compra",

    fr: "Prix d'achat",

    en: "Purchase price",

  },

  salePrice: {

    pt: "Preço de venda",

    fr: "Prix de vente",

    en: "Sale price",

  },

  supplier: {

    pt: "Fornecedor",

    fr: "Fournisseur",

    en: "Supplier",

  },

  Suppliers: {

    pt: "Fornecedores",

    fr: "Fournisseurs",

    en: "Suppliers",

  },

  Employee: {

    pt: "Funcionário",

    fr: "Employé",

    en: "Employee",

  },

  Employees: {

    pt: "Funcionários",

    fr: "Employés",

    en: "Employees",

  },


  Salaries: {

    pt: "Salários",

    fr: "Salaires",

    en: "Salaries",

  },

  payment: {

    pt: "Pagamento",

    fr: "Paiement",

    en: "Payment",

  },

  pay: {

    pt: "Pagar",

    fr: "Payer",

    en: "Pay",

  },

  Paid: {

    pt: "Pago",

    fr: "Payé",

    en: "Paid",

  },

  unpaid: {

    pt: "Não pago",

    fr: "Non payé",

    en: "Unpaid",

  },

  recurring: {

    pt: "Periódico",

    fr: "Périodique",

    en: "Recurring",

  },

  oneTime: {

    pt: "Pontual",

    fr: "Ponctuel",

    en: "One-time",

  },

  monthly: {

    pt: "Mensal",

    fr: "Mensuel",

    en: "Monthly",

  },

  weekly: {

    pt: "Semanal",

    fr: "Hebdomadaire",

    en: "Weekly",

  },

  yearly: {

    pt: "Anual",

    fr: "Annuel",

    en: "Yearly",

  },

  event: {

    pt: "Evento",

    fr: "Événement",

    en: "Event",

  },

  events: {

    pt: "Eventos",

    fr: "Événements",

    en: "Events",

  },

  calendar: {

    pt: "Calendário",

    fr: "Calendrier",

    en: "Calendar",

  },

  Reminder: {

    pt: "Lembrete",

    fr: "Rappel",

    en: "Reminder",

  },

  LowStock: {

    pt: "Stock baixo",

    fr: "Stock faible",

    en: "Low stock",

  },

  stockValue: {

    pt: "Valor do stock",

    fr: "Valeur du stock",

    en: "Stock value",

  },

  NetProfit: {

    pt: "Lucro líquido",

    fr: "Bénéfice net",

    en: "Net profit",

  },

  GrossProfit: {

    pt: "Lucro bruto",

    fr: "Bénéfice brut",

    en: "Gross profit",

  },

  potentialProfit: {

    pt: "Lucro potencial",

    fr: "Bénéfice potentiel",

    en: "Potential profit",

  },

  todaySales: {

    pt: "Vendas de hoje",

    fr: "Ventes du jour",

    en: "Today's sales",

  },

  monthSales: {

    pt: "Vendas do mês",

    fr: "Ventes du mois",

    en: "Monthly sales",

  },

  currentCash: {

    pt: "Caixa atual",

    fr: "Caisse actuelle",

    en: "Current cash",

  },

  bestCantina: {

    pt: "Melhor cantina",

    fr: "Meilleure cantine",

    en: "Best canteen",

  },

  managementAdvice: {

    pt: "Conselho de gestão",

    fr: "Conseil de gestion",

    en: "Management advice",

  },

  NewEvent: {

    pt: "Novo evento",

    fr: "Nouvel événement",

    en: "New event",

  },

  upcomingEvents: {

    pt: "Próximos eventos",

    fr: "Prochains événements",

    en: "Upcoming events",

  },

  language: {

    pt: "Idioma",

    fr: "Langue",

    en: "Language",

  },

  portuguese: {

    pt: "Português",

    fr: "Portugais",

    en: "Portuguese",

  },

  french: {

    pt: "Francês",

    fr: "Français",

    en: "French",

  },

  english: {

    pt: "Inglês",

    fr: "Anglais",

    en: "English",

  },

};


const I18nContext = createContext<{

  lang: Lang;

  setLang: (lang: Lang) => void;

  t: (key: string) => string;

}>({

  lang: "pt",

  setLang: () => {},

  t: (key) => key,

});

export function I18nProvider({

  children,

}: {

  children: React.ReactNode;

}) {

  const [lang, setLangState] = useState<Lang>(() => "pt");

  useEffect(() => {
  const saved = localStorage.getItem("norbee_lang");

  if (
    saved === "pt" ||
    saved === "fr" ||
    saved === "en"
  ) {
    setLangState(saved as Lang);
  }
}, []);

  function setLang(value: Lang) {

    setLangState(value);

    localStorage.setItem("norbee_lang", value);

  }

  function t(key: string) {

    return dictionary[key]?.[lang] || key;

  }

  return (

    <I18nContext.Provider

      value={{

        lang,

        setLang,

        t,

      }}

    >

      {children}

    </I18nContext.Provider>

  );

}

export function useI18n() {

  return useContext(I18nContext);

}



