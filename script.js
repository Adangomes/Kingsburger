// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-26.49624, -49.07919]; 
const TAXA_BASE = 4.0;
const VALOR_POR_KM = 1.50;
const WHATSAPP_NUMERO = "5547997278232";

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
let descontoAplicado = 0;

let itemMestreTemporario = null; 
let saboresSelecionados = [];
let limiteSabores = 0;
let tamanhoSelecionadoGlobal = ""; 
let statusLojaAtual = {
    aberto: false,
    horarioAbertura: "00:00",
    horarioFechamento: "00:00",
    diasAbertos: []
};

// --- INICIALIZAÇÃO FIREBASE ---
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
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.database();
    }
    return null;
}

const db = inicializarFirebase();

// --- FUNÇÃO PARA CARREGAR PRODUTOS ---
async function carregarCardapioCompleto() {
    if (!db) return;
    try {
        console.log("Tentando carregar produtos do Firebase...");
        const snapshot = await db.ref('cardapio/produtos').once('value');
        const data = snapshot.val() || [];

        // data já é array ou objeto de produtos
        produtosGeral = Array.isArray(data) ? data : Object.values(data);

        if (produtosGeral.length === 0) {
            console.warn("A lista de produtos está vazia!");
        } else {
            console.log("Produtos carregados:", produtosGeral);
            renderizarCardapio();
        }
    } catch (err) {
        console.error("Erro ao carregar cardápio:", err);
    }
}

// --- FUNÇÃO PARA CARREGAR STATUS DA LOJA ---
function carregarStatusLoja() {
    db.ref('status_kings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            statusLojaAtual = data;
            console.log("Status da loja atualizado:", statusLojaAtual);
        }
    });
}

// --- RENDERIZAÇÃO DO CARDÁPIO ---
function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
    if (!corpo || !nav) return;

    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];

    categorias.forEach((cat, idx) => {
        // botões de categoria
        const btn = document.createElement("button");
        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;
        btn.innerText = cat.toUpperCase();
        btn.onclick = () => scrollToCategoria(cat);
        btn.setAttribute("data-categoria", cat);
        nav.appendChild(btn);

        // seção de produtos
        const section = document.createElement("section");
        section.className = "secao-categoria";
        section.id = `secao-${cat}`;
        section.innerHTML = `<h2 class="titulo-categoria">${cat.toUpperCase()}</h2>`;

        produtosGeral
            .filter(p => p.categoria === cat)
            .forEach(p => {
                const precoExibido = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : "Escolher Opções";
                section.innerHTML += `
                    <div class="item-produto-lista" onclick="decidirFluxo('${p.title}')">
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

function scrollToCategoria(cat) {
    const el = document.getElementById(`secao-${cat}`);
    if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}

// --- LOGIN ANÔNIMO E INICIALIZAÇÃO ---
firebase.auth().signInAnonymously()
  .then(() => {
      console.log("Usuário anônimo autenticado!");
      // só renderiza depois do DOM estar pronto
      document.addEventListener("DOMContentLoaded", () => {
          carregarCardapioCompleto();
          carregarStatusLoja();
          carregarCarrinhoStorage();
          window.addEventListener("scroll", sincronizarScrollMenu);
          verificarFechamentoAutomatico();
      });
  })
  .catch(err => console.error("Erro login anônimo:", err));