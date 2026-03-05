// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-49.024909, -26.464334]; 
const TAXA_BASE = 5;
const VALOR_POR_KM = 4.0;

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
let descontoAplicado = 0;
let itemMestreTemporario = null; 
let saboresSelecionados = [];
let limiteSabores = 0;
let tamanhoSelecionadoGlobal = ""; 

document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
    window.addEventListener("scroll", sincronizarScrollMenu);
});

// --- CONTROLE DE INTERFACE (RODAPÉ) ---
function gerenciarFooter(visivel) {
    const footer = document.querySelector("footer"); // Certifique-se que a tag é <footer> no seu HTML
    if (footer) {
        footer.style.display = visivel ? "block" : "none";
    }
}

// --- 1. CARREGAMENTO ---
async function carregarCardapioCompleto() {
    try {
        const res = await fetch("content/produtos.json?v=" + Date.now());
        const data = await res.json();
        produtosGeral = data.produtos;
        renderizarCardapio();
    } catch (e) { console.error("Erro JSON:", e); }
}

function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
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
        produtosGeral.filter(p => p.categoria === cat).forEach(p => {
            if (p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg")) return;
            if (p.categoria === 'pizza' && !p.title.includes("PIZZA ")) return;
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

// --- 2. LOGICA DE SELEÇÃO E CARRINHO ---
function decidirFluxo(nome) {
    const p = produtosGeral.find(prod => prod.title === nome);
    if (p.categoria === 'pizza' || p.categoria === 'porcao') {
        abrirModalSelecao(nome);
    } else {
        adicionarAoCarrinho(p.title, p.price, "");
    }
}

function abrirModalSelecao(nome) {
    itemMestreTemporario = produtosGeral.find(p => p.title === nome);
    saboresSelecionados = [];
    gerenciarFooter(false);
    document.getElementById("pizza-options-modal").style.display = "flex";
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
}

function fecharModalSelecao() { 
    document.getElementById("pizza-options-modal").style.display = "none"; 
    gerenciarFooter(true);
}

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

// --- 3. ENTREGA E FINALIZAÇÃO (O LOOP QUE VOCÊ QUER) ---

async function processarResumoGeo() {
    const rua = document.getElementById("rua")?.value;
    const num = document.getElementById("numero")?.value;
    if (!rua || !num) return alert("Preencha Rua e Número!");

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex";

    try {
        const query = encodeURIComponent(`${rua}, ${num}, Guaramirim, SC, Brasil`);
        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();
        await new Promise(r => setTimeout(r, 1500)); // Efeito visual

        if (data.features?.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[1], RESTAURANTE_COORD[0], lat, lon);
            taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
        } else {
            taxaEntregaCalculada = TAXA_BASE;
        }
        mostrarResumoFinal();
    } catch (e) {
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        if(loader) loader.style.display = "none";
    }
}

async function enviarPedidoFinal() {
    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex";

    const dados = {
        nome: document.getElementById("nomeCliente")?.value || "Cliente",
        rua: document.getElementById("rua")?.value,
        num: document.getElementById("numero")?.value,
        bairro: document.getElementById("bairro")?.value,
        pag: document.getElementById("pagamento")?.value
    };

    try {
        // Envia para o Firebase (Sua função salvarPedidoFirebase já está no final do script)
        await salvarPedidoFirebase(dados);
        
        // Espera 2 segundos com o loader girando para dar o efeito
        await new Promise(r => setTimeout(r, 2000));

        alert("PEDIDO ENVIADO COM SUCESSO!");

        // RESET TOTAL E RETORNO À TELA INICIAL
        carrinho = [];
        localStorage.removeItem("carrinho");
        atualizarCarrinho();
        
        // Fechar Modais e Resetar Telas Internas
        document.getElementById("delivery-modal").style.display = "none";
        document.getElementById("resumo-pedido").style.display = "none";
        document.getElementById("form-entrega").style.display = "block";
        document.body.style.overflow = "auto";
        
        gerenciarFooter(true); // Volta o rodapé
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (e) {
        alert("Erro ao enviar pedido. Tente novamente.");
    } finally {
        if (loader) loader.style.display = "none";
    }
}

// --- MODAIS COM CONTROLE DE FOOTER ---
function abrirCarrinho() { 
    document.getElementById("cart-modal").style.display = "flex"; 
    gerenciarFooter(false);
}
function fecharCarrinho() { 
    document.getElementById("cart-modal").style.display = "none"; 
    gerenciarFooter(true);
}
function abrirDelivery() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex";
    gerenciarFooter(false);
}
function fecharModalEntrega() { 
    document.getElementById('delivery-modal').style.display = 'none'; 
    gerenciarFooter(true);
}

// --- FIREBASE ---
const db = inicializarFirebase();

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

function salvarPedidoFirebase(dados) {
    if (!db) return Promise.reject();
    const novoPedidoRef = db.ref('pedidos').push();
    return novoPedidoRef.set({
        cliente: dados.nome,
        endereco: `${dados.rua}, ${dados.num} - ${dados.bairro}`,
        pagamento: dados.pag,
        itens: carrinho,
        total: (carrinho.reduce((acc, i) => acc + i.price, 0) + taxaEntregaCalculada - descontoAplicado),
        horario: new Date().toLocaleTimeString('pt-BR'),
        status: "pendente"
    });
}

// Mantenha suas outras funções auxiliares (calcularDistancia, mostrarToast, etc.) abaixo daqui...
