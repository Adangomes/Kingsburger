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

// --- LOGIN ANÔNIMO ---
firebase.auth().signInAnonymously()
  .then(() => {
      console.log("Usuário anônimo autenticado!");
      // Carrega cardápio e status da loja só depois da autenticação
      carregarCardapioCompleto();
      carregarStatusLoja();
  })
  .catch(err => console.error("Erro login anônimo:", err));

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
    carregarCarrinhoStorage();
    window.addEventListener("scroll", sincronizarScrollMenu);
    verificarFechamentoAutomatico();
});

// =====================
// FUNÇÕES DE CARDÁPIO
// =====================
async function carregarCardapioCompleto() {
    if (!db) return;
    try {
        const snapshot = await db.ref('cardapio_kings').once('value');
        const data = snapshot.val() || {};
        produtosGeral = data.produtos || [];
        console.log("Produtos carregados do Firebase:", produtosGeral);
        renderizarCardapio();
    } catch (err) {
        console.error("Erro ao carregar cardápio:", err);
    }
}

function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
    if (!corpo || !nav) return;

    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];

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

// =====================
// FUNÇÕES DE SELEÇÃO DE PRODUTOS
// =====================
function decidirFluxo(nome) {
    if (!lojaEstaAbertaAgora()) { mostrarModalFechado(); return; }
    const p = produtosGeral.find(prod => prod.title === nome);
    if (p.categoria === 'pizza' || p.categoria === 'porcao') abrirModalSelecao(nome);
    else adicionarAoCarrinho(p.title, p.price, "");
}

function abrirModalSelecao(nome) {
    itemMestreTemporario = produtosGeral.find(p => p.title === nome);
    saboresSelecionados = [];
    const modal = document.getElementById("pizza-options-modal");
    document.getElementById("pizza-modal-title").innerText = nome;
    document.getElementById("pergunta-qtd-sabores").style.display = "none";
    document.getElementById("secao-sabores").style.display = "none";

    if (itemMestreTemporario.categoria === 'pizza') {
        if (nome.includes("PIZZA P")) {
            tamanhoSelecionadoGlobal = "P";
            montarListaSabores(1, 'pizza');
        } else {
            document.getElementById("pergunta-qtd-sabores").style.display = "block";
            const max = nome.includes("PIZZA M") ? 2 : 3;
            tamanhoSelecionadoGlobal = nome.includes("PIZZA M") ? "M" : "G";
            const containerBotoes = document.getElementById("botoes-qtd-sabores");
            containerBotoes.innerHTML = "";
            for (let i = 1; i <= max; i++) {
                containerBotoes.innerHTML += `<button class="btn-principal m-1" onclick="montarListaSabores(${i}, 'pizza')">${i} Sabor${i>1?'es':''}</button>`;
            }
        }
    } else {
        tamanhoSelecionadoGlobal = nome.includes("600g") ? "P" : "G";
        montarListaSabores(1, 'porcao');
    }

    modal.style.display = "flex";
}

function montarListaSabores(n, tipo) {
    limiteSabores = n;
    document.getElementById("pergunta-qtd-sabores").style.display = "none";
    document.getElementById("secao-sabores").style.display = "block";
    const grid = document.getElementById("lista-sabores-meia");
    grid.innerHTML = "";

    const opcoes = (tipo === 'pizza') 
        ? produtosGeral.filter(p => p.categoria === 'pizza' && !p.title.includes("PIZZA ")) 
        : produtosGeral.filter(p => p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg"));

    opcoes.forEach(opt => {
        grid.innerHTML += `
            <div class="item-sabor-wizard" onclick="toggleSabor('${opt.title}')">
                <div><strong>${opt.title}</strong><br><small>${opt.ingredientes || ""}</small></div>
                <span class="check-icon">⚪</span>
            </div>`;
    });
}

function toggleSabor(nome) {
    const idx = saboresSelecionados.indexOf(nome);
    if (idx > -1) { saboresSelecionados.splice(idx, 1); } 
    else if (saboresSelecionados.length < limiteSabores) {
        if (limiteSabores === 1) saboresSelecionados = [];
        saboresSelecionados.push(nome);
    }

    document.getElementById("lista-sabores-meia").classList.toggle("limite-atingido", saboresSelecionados.length >= limiteSabores);
    document.querySelectorAll(".item-sabor-wizard").forEach(el => {
        const txt = el.querySelector("strong").innerText;
        const sel = saboresSelecionados.includes(txt);
        el.classList.toggle("selecionado", sel);
        el.querySelector(".check-icon").innerText = sel ? "✅" : "⚪";
    });
}

function confirmarSelecao() {
    if (saboresSelecionados.length === 0) return alert("Selecione uma opção!");
    let precoFinal = 0;
    let tituloItem = itemMestreTemporario.title;
    if (itemMestreTemporario.categoria === 'pizza') {
        precoFinal = itemMestreTemporario.prices[tamanhoSelecionadoGlobal];
        tituloItem += ` (${saboresSelecionados.join("/")})`;
    } else {
        const opt = produtosGeral.find(p => p.title === saboresSelecionados[0]);
        precoFinal = opt.prices[tamanhoSelecionadoGlobal];
        tituloItem += ` - ${saboresSelecionados[0]}`;
    }
    adicionarAoCarrinho(tituloItem, precoFinal, "");
    fecharModalSelecao();
}

// =====================
// FUNÇÕES DE CARRINHO
// =====================
function adicionarAoCarrinho(titulo, preco, sabor) {
    carrinho.push({ title: titulo, price: preco, sabor: sabor });
    atualizarCarrinho();
    mostrarToast(titulo);
}

function atualizarCarrinho() {
    const box = document.getElementById("cart-items");
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

// =====================
// FUNÇÕES DE ENTREGA / GEOAPIFY
// =====================
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;

    if (!nome || !rua || !num) return alert("Preencha os dados para calcular a entrega!");

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex"; 

    try {
        const boundingBox = "-49.2558,-26.5771,-48.9248,-26.3461"; 
        const query = encodeURIComponent(`${rua}, ${num}, Santa Catarina, Brasil`);
        const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&filter=rect:${boundingBox}&apiKey=${GEOAPIFY_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (data.features && data.features.length > 0) {
            const result = data.features[0].properties;
            const cidadeEncontrada = result.city ? result.city.toLowerCase() : "";
            const cidadesPermitidas = ["jaraguá do sul", "guaramirim", "schroeder"];
            
            if (!cidadesPermitidas.some(c => cidadeEncontrada.includes(c))) {
                alert("Desculpe! No momento atendemos apenas Jaraguá do Sul, Guaramirim e Schroeder.");
                if (loader) loader.style.display = "none";
                return;
            }

            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[0], RESTAURANTE_COORD[1], lat, lon);
            let taxaBruta = TAXA_BASE + (dist * VALOR_POR_KM);
            taxaEntregaCalculada = parseFloat(taxaBruta.toFixed(2));
            mostrarResumoFinal();
        } else {
            alert("Endereço não encontrado na nossa região de entrega.");
        }
    } catch (e) {
        console.error("Erro:", e);
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        if (loader) loader.style.display = "none";
    }
}

// =====================
// FUNÇÕES AUXILIARES
// =====================
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function lojaEstaAbertaAgora() {
    if (!statusLojaAtual.aberto) return false;
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAgora = agora.getHours()*60 + agora.getMinutes();
    const [hA, mA] = statusLojaAtual.horarioAbertura.split(":").map(Number);
    const [hF, mF] = statusLojaAtual.horarioFechamento.split(":").map(Number);
    const aberturaMin = hA*60 + mA;
    const fechamentoMin = hF*60 + mF;
    const diaPermitido = statusLojaAtual.diasAbertos.includes(diaSemana);
    const horarioPermitido = minutosAgora >= aberturaMin && minutosAgora <= fechamentoMin;
    return diaPermitido && horarioPermitido;
}

function mostrarModalFechado() {
    const modal = document.getElementById("modal-fechado");
    if (!modal) return;
    const texto = modal.querySelector("p");
    const abertura = statusLojaAtual.horarioAbertura || "00:00";
    const fechamento = statusLojaAtual.horarioFechamento || "00:00";
    texto.innerHTML = `Nosso horário de funcionamento é:<br><strong>Hoje das ${abertura} às ${fechamento}</strong><br>Por favor, tente mais tarde.`;
    modal.style.display = "flex";
}

function verificarFechamentoAutomatico() {
    setTimeout(() => {
        if (!lojaEstaAbertaAgora()) mostrarModalFechado();
    }, 1000);
}

// --- ATUALIZA STATUS EM TEMPO REAL ---
db.ref('configuracoes/statusLoja').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    statusLojaAtual = data;
});

// =====================
// FUNÇÃO PARA ENVIAR PEDIDO
// =====================
function enviarWhatsApp() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;
    const bairro = document.getElementById("bairro")?.value || document.getElementById("input-bairro")?.value;
    const pag = document.getElementById("pagamento")?.value || "A combinar";
    const totalMsg = document.getElementById("resumo-total")?.innerText || "";

    if (!nome || !rua) return alert("Preencha os dados de entrega!");

    let msg = `*NOVO PEDIDO - KINGSBURG*\n------------------------------\n *Cliente:* ${nome}\n *Endereço:* ${rua}, ${num}\n *Bairro:* ${bairro}\n *Pagamento:* ${pag}\n------------------------------\n *ITENS:*\n`;
    carrinho.forEach(i => msg += `• ${i.title} - R$ ${i.price.toFixed(2)}\n`);
    msg += `------------------------------\n *Taxa de Entrega:* R$ ${taxaEntregaCalculada.toFixed(2)}\n *${totalMsg}*`;

    const urlZap = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMERO}&text=${encodeURIComponent(msg)}`;
    window.location.href = urlZap;
}