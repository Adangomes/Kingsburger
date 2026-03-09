// --- CONFIGURAÇÕES GLOBAIS ---
const ID_LOJA = "kings_burger"; 
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775"; 
const RESTAURANTE_COORD = { lat: -26.464334, lon: -49.024909 }; 
const TAXA_BASE = 5.00; 
const VALOR_POR_KM = 4.00;

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;  
let descontoAplicado = 0;
let latDestino = null;
let lonDestino = null;

const db = firebase.database();

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
    inicializarAutocomplete(); // Ativa o Geoapify no campo Rua
});

// --- AUTOCOMPLETE GEOAPIFY ---
function inicializarAutocomplete() {
    const inputRua = document.getElementById("rua");
    // Criamos um container para as sugestões se não existir
    let sugestaoBox = document.getElementById("lista-sugestoes");
    if (!sugestaoBox) {
        sugestaoBox = document.createElement("div");
        sugestaoBox.id = "lista-sugestoes";
        sugestaoBox.className = "list-group position-absolute w-100";
        sugestaoBox.style.zIndex = "9999";
        inputRua.parentNode.appendChild(sugestaoBox);
    }

    inputRua.addEventListener("input", async (e) => {
        const valor = e.target.value;
        if (valor.length < 3) { sugestaoBox.innerHTML = ""; return; }

        const cidade = document.getElementById("cidade").value;
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(valor + " " + cidade)}&apiKey=${GEOAPIFY_KEY}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            sugestaoBox.innerHTML = "";
            
            data.features.forEach(f => {
                const item = document.createElement("button");
                item.className = "list-group-item list-group-item-action";
                item.innerHTML = `<b>${f.properties.street || f.properties.name}</b> <small>${f.properties.district || f.properties.suburb || ""}</small>`;
                item.onclick = (event) => {
                    event.preventDefault();
                    inputRua.value = f.properties.street || f.properties.name;
                    document.getElementById("bairro").value = f.properties.district || f.properties.suburb || "";
                    latDestino = f.properties.lat;
                    lonDestino = f.properties.lon;
                    sugestaoBox.innerHTML = "";
                    document.getElementById("numero").focus();
                };
                sugestaoBox.appendChild(item);
            });
        } catch (err) { console.error("Erro Geoapify:", err); }
    });
}

// --- CÁLCULO DE DISTÂNCIA E TAXA ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente").value;
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;

    if (!nome || !rua || !num) return alert("Preencha Nome, Rua e Número!");
    if (!latDestino) return alert("Selecione o endereço na lista de sugestões!");

    document.getElementById("loading-geral").style.display = "flex";

    try {
        const dist = calcularDistancia(RESTAURANTE_COORD.lat, RESTAURANTE_COORD.lon, latDestino, lonDestino);
        taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
        if (taxaEntregaCalculada < TAXA_BASE) taxaEntregaCalculada = TAXA_BASE;

        exibirResumoFinal();
    } catch (e) {
        alert("Erro ao calcular frete. Usando taxa mínima.");
        taxaEntregaCalculada = TAXA_BASE;
        exibirResumoFinal();
    } finally {
        document.getElementById("loading-geral").style.display = "none";
    }
}

function exibirResumoFinal() {
    const box = document.getElementById("resumo-itens");
    box.innerHTML = "";
    let sub = 0;

    carrinho.forEach(i => {
        sub += i.price;
        box.innerHTML += `<div class="d-flex justify-content-between"><span>${i.title}</span><span>R$ ${i.price.toFixed(2)}</span></div>`;
    });

    const total = sub + taxaEntregaCalculada - descontoAplicado;
    document.getElementById("resumo-taxa").innerHTML = `
        <div class="d-flex justify-content-between"><span>Subtotal:</span><span>R$ ${sub.toFixed(2)}</span></div>
        <div class="d-flex justify-content-between text-success fw-bold"><span>Entrega:</span><span>R$ ${taxaEntregaCalculada.toFixed(2)}</span></div>
    `;
    document.getElementById("resumo-total").innerText = `Total: R$ ${total.toFixed(2)}`;
    
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

// --- ENVIO FIREBASE ---
async function enviarPedidoFirebase() {
    const nome = document.getElementById("nomeCliente").value;
    const fone = document.getElementById("telefone").value;
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;
    const cidade = document.getElementById("cidade").value;
    const pag = document.getElementById("pagamento").value;
    const obs = document.getElementById("obsPedido").value;

    try {
        const subtotal = carrinho.reduce((acc, i) => acc + i.price, 0);
        const novoPedidoRef = db.ref(`pedidos/${ID_LOJA}`).push();
        
        await novoPedidoRef.set({
            cliente: nome,
            contato: fone,
            endereco: `${rua}, ${num} - ${bairro}, ${cidade}`,
            pagamento: pag,
            itens: carrinho.map(i => ({ produto: i.title, preco: i.price })),
            taxaEntrega: taxaEntregaCalculada,
            total: subtotal + taxaEntregaCalculada - descontoAplicado,
            horario: new Date().toLocaleTimeString('pt-BR'),
            status: "Pendente"
        });

        alert("Pedido enviado com sucesso!");
        localStorage.removeItem("carrinho");
        location.reload();
    } catch (err) { alert("Erro ao enviar pedido!"); }
}

// --- FUNÇÕES AUXILIARES (CARDÁPIO) ---
async function carregarCardapioCompleto() {
    try {
        const res = await fetch("content/produtos.json?v=" + Date.now());
        const data = await res.json();
        produtosGeral = data.produtos;
        renderizarCardapio();
    } catch (e) { console.error("Erro ao carregar produtos."); }
}

function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    if(!corpo) return;
    corpo.innerHTML = "";
    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];
    
    categorias.forEach(cat => {
        const section = document.createElement("section");
        section.innerHTML = `<h2 class="mt-4 mb-3">${cat.toUpperCase()}</h2>`;
        produtosGeral.filter(p => p.categoria === cat).forEach(p => {
            section.innerHTML += `
                <div class="card mb-2 p-2 d-flex flex-row justify-content-between align-items-center" onclick="adicionarAoCarrinho('${p.title}', ${p.price})">
                    <div><b>${p.title}</b><br><small>R$ ${p.price.toFixed(2)}</small></div>
                    <button class="btn btn-warning btn-sm">+</button>
                </div>`;
        });
        corpo.appendChild(section);
    });
}

function adicionarAoCarrinho(titulo, preco) {
    carrinho.push({ title: titulo, price: preco });
    atualizarCarrinho();
    const toast = document.getElementById("toast-geral");
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 2000);
}

function atualizarCarrinho() {
    const box = document.getElementById("cart-items");
    let sub = 0;
    box.innerHTML = "";
    carrinho.forEach((item, index) => {
        sub += item.price;
        box.innerHTML += `<div class="d-flex justify-content-between"><span>${item.title}</span><button class="btn btn-sm text-danger" onclick="removerItem(${index})">X</button></div>`;
    });
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("total").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length;
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }
function carregarStatusLoja() { document.getElementById("status-loja").innerText = "ABERTO"; }
function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }
function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }
function abrirDelivery() { fecharCarrinho(); document.getElementById("delivery-modal").style.display = "flex"; }
function toggleTroco(val) { document.getElementById("div-troco").style.display = val === "Dinheiro" ? "block" : "none"; }
function voltarParaEntrega() { document.getElementById("resumo-pedido").style.display = "none"; document.getElementById("form-entrega").style.display = "block"; }
function carregarCarrinhoStorage() { const s = localStorage.getItem("carrinho"); if(s) { carrinho = JSON.parse(s); atualizarCarrinho(); } }
