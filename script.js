// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-26.49624, -49.07919]; 
const TAXA_BASE = 4.0;
const VALOR_POR_KM = 1.50;
const WHATSAPP_NUMERO = "5547997278232";

// --- VARIÁVEIS GLOBAIS ---
let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
let descontoAplicado = 0;
let itemMestreTemporario = null; 
let saboresSelecionados = [];
let limiteSabores = 0;
let tamanhoSelecionadoGlobal = ""; 
let primeiraCargaFeita = true; // Força true para renderizar o cardápio sem esperar o Firebase

// Cache inicial do status para não carregar vazio
let statusLojaAtual = JSON.parse(localStorage.getItem("status_kings_burger")) || {
    aberto: true,
    horarioAbertura: "18:00",
    horarioFechamento: "23:59",
    diasAbertos: [0,1,2,3,4,5,6]
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o Firebase primeiro
    const db = inicializarFirebase();
    
    // Carrega os dados locais e inicia escutas
    carregarCardapioCompleto(db);
    carregarCarrinhoStorage();
    configurarVigilanteStatus(db);
    
    window.addEventListener("scroll", sincronizarScrollMenu);
});

// --- FIREBASE SETUP ---
function inicializarFirebase() {
    if (typeof firebase !== 'undefined') {
        const firebaseConfig = {
            apiKey: "AIzaSyCXA1yP1F-riNkzOX5zJs5gsQ82EzsT7Qg",
            authDomain: "myproject26-10f0e.firebaseapp.com",
            databaseURL: "https://myproject26-10f0e-default-rtdb.firebaseio.com",
            projectId: "myproject26-10f0e",
            storageBucket: "myproject26-10f0e.firebasestorage.app",
            messagingSenderId: "884850608032",
            appId: "1:884850608032:web:79db6983346c3c20edc6c5"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        return firebase.database();
    }
    return null;
}

const db = inicializarFirebase();

// --- VIGILANTE DE STATUS (FIREBASE) ---
function configurarVigilanteStatus(db) {
    if (!db) return;
    db.ref('configuracoes/statusLoja').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        statusLojaAtual = data;
        localStorage.setItem("status_kings_burger", JSON.stringify(data));
        
        const aberta = lojaEstaAbertaAgora();
        atualizarInterfaceStatus(aberta);
    });
}

function atualizarInterfaceStatus(aberta) {
    const elStatus = document.getElementById("status-loja");
    if (elStatus) {
        elStatus.innerText = aberta ? "ABERTO" : "FECHADO";
        elStatus.className = `status ${aberta ? 'aberto' : 'fechado'}`;
    }

    const modalFechado = document.getElementById("modal-fechado");
    if (!aberta) {
        mostrarModalFechado();
    } else if (modalFechado) {
        modalFechado.style.display = "none";
    }

    // Bloqueia/Libera o botão de checkout
    const btnPedir = document.querySelector(".btn-finalizar-carrinho");
    if (btnPedir) {
        btnPedir.disabled = !aberta;
        btnPedir.style.opacity = aberta ? "1" : "0.5";
    }

    // Opacidade nos produtos
    document.querySelectorAll(".item-produto-lista").forEach(item => {
        item.style.pointerEvents = aberta ? "auto" : "none";
        item.style.opacity = aberta ? "1" : "0.4";
    });
}

// --- LÓGICA DE HORÁRIOS ---
function lojaEstaAbertaAgora() {
    if (!statusLojaAtual.aberto) return false;
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const [hA, mA] = (statusLojaAtual.horarioAbertura || "00:00").split(":").map(Number);
    const [hF, mF] = (statusLojaAtual.horarioFechamento || "23:59").split(":").map(Number);
    
    const aberturaMin = hA * 60 + mA;
    const fechamentoMin = hF * 60 + mF;
    
    return statusLojaAtual.diasAbertos.includes(agora.getDay()) && 
           (minutosAgora >= aberturaMin && minutosAgora <= fechamentoMin);
}

function mostrarModalFechado() {
    const modal = document.getElementById("modal-fechado");
    if (!modal) return;
    modal.querySelector("p").innerHTML = `
        Nosso horário de funcionamento é:<br>
        <strong>Hoje das ${statusLojaAtual.horarioAbertura} às ${statusLojaAtual.horarioFechamento}</strong>
    `;
    modal.style.display = "flex";
}

// --- CARREGAMENTO DO CARDÁPIO ---
async function carregarCardapioCompleto(db) {
    if (!db) return;
    db.ref('cardapio/produtos').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            produtosGeral = Array.isArray(data) ? data : Object.values(data);
            renderizarCardapio();
            console.log("Cardápio carregado com sucesso! ✅");
        }
    });
}

function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
    if (!corpo || !nav) return;

    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];
    const aberta = lojaEstaAbertaAgora();

    categorias.forEach((cat, idx) => {
        const btn = document.createElement("button");
        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;
        btn.innerText = cat.toUpperCase();
        btn.onclick = () => scrollToCategoria(cat);
        btn.setAttribute("data-categoria", cat);
        nav.appendChild(btn);

        const section = document.createElement("section");
        section.className = "secao-categoria";
        section.id = `secao-${cat}`;
        section.innerHTML = `<h2 class="titulo-categoria">${cat.toUpperCase()}</h2>`;

        produtosGeral.filter(p => p.categoria === cat).forEach(p => {
            if (p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg")) return;
            if (p.categoria === 'pizza' && !p.title.includes("PIZZA ")) return;

            const precoExibido = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : "Escolher Opções";

            section.innerHTML += `
                <div class="item-produto-lista" 
                     style="pointer-events: ${aberta ? 'auto' : 'none'}; opacity: ${aberta ? '1' : '0.4'}" 
                     onclick="decidirFluxo('${p.title}')">
                    <div class="info-produto">
                        <h3>${p.title}</h3>
                        <p>${p.ingredientes || ""}</p>
                        <span class="preco-unico">${precoExibido}</span>
                    </div>
                    <div class="foto-produto-lista">
                        <img src="${p.image}" onerror="this.src='imagens/placeholder.png'">
                        <button class="btn-add-lista">+</button>
                    </div>
                </div>`;
        });
        corpo.appendChild(section);
    });
}

// --- FLUXO DE PEDIDO E MODAIS ---
function decidirFluxo(nome) {
    if (!lojaEstaAbertaAgora()) { mostrarModalFechado(); return; }
    const p = produtosGeral.find(prod => prod.title === nome);
    if (!p) return;

    if (p.categoria === 'pizza' || p.categoria === 'porcao') {
        abrirModalSelecao(nome);
    } else {
        adicionarAoCarrinho(p.title, p.price, "");
    }
}

// [Mantenha aqui suas funções de abrirModalSelecao, montarListaSabores, confirmarSelecao que já funcionam]

// --- CARRINHO ---
function adicionarAoCarrinho(titulo, preco, sabor) {
    carrinho.push({ title: titulo, price: preco, sabor: sabor });
    atualizarCarrinho();
    mostrarToast(titulo);
}

function atualizarCarrinho() {
    const box = document.getElementById("cart-items");
    if (!box) return;
    box.innerHTML = "";
    let sub = 0;
    carrinho.forEach((item, index) => {
        sub += item.price;
        box.innerHTML += `
            <div class="cart-item-row">
                <div style="flex:1">
                    <strong>${item.title}</strong><br>
                    <b style="color: #00a650;">R$ ${item.price.toFixed(2)}</b>
                </div>
                <button onclick="removerItem(${index})" class="btn-excluir-apenas-x">X</button>
            </div>`;
    });
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("total").innerText = `R$ ${(sub - descontoAplicado).toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    atualizarCarrinho();
}

function carregarCarrinhoStorage() {
    const s = localStorage.getItem("carrinho");
    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }
}

// --- UTILITÁRIOS ---
function scrollToCategoria(cat) {
    const el = document.getElementById(`secao-${cat}`);
    if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}

function sincronizarScrollMenu() {
    const secoes = document.querySelectorAll(".secao-categoria");
    const botoes = document.querySelectorAll(".cat-item");
    let atual = "";
    secoes.forEach(s => { if (window.pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });
    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));
}

function mostrarToast(t) { 
    const el = document.getElementById("toast-geral");
    if (el) {
        el.innerText = t + " adicionado! ✅"; 
        el.style.display = "block";
        setTimeout(() => el.style.display = "none", 2000);
    }
}
