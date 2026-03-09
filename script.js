// --- 1. CONFIGURAÇÕES GLOBAIS ---
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

// --- 2. INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
    inicializarAutocomplete(); 
});

// Auxiliar para sumir/voltar o rodapé (Bottom Nav)
function controlarRodape(esconder) {
    const rodape = document.querySelector('.bottom-nav-container');
    if (rodape) {
        if (esconder) rodape.classList.add('nav-hidden');
        else rodape.classList.remove('nav-hidden');
    }
}

// --- 3. AUTOCOMPLETE GEOAPIFY ---
function inicializarAutocomplete() {
    const inputRua = document.getElementById("rua");
    const sugestaoBox = document.getElementById("lista-sugestoes");

    if (!inputRua || !sugestaoBox) return;

    inputRua.addEventListener("input", async (e) => {
        const valor = e.target.value;
        if (valor.length < 3) {
            sugestaoBox.innerHTML = "";
            sugestaoBox.style.display = "none";
            return;
        }

        const cidade = document.getElementById("cidade").value;
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(valor + " " + cidade)}&apiKey=${GEOAPIFY_KEY}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            sugestaoBox.innerHTML = "";
            
            if (data.features && data.features.length > 0) {
                sugestaoBox.style.display = "block";
                data.features.forEach(f => {
                    const item = document.createElement("div");
                    item.className = "sugestao-item";
                    item.innerHTML = `<b>${f.properties.street || f.properties.name}</b> <br> <small>${f.properties.district || f.properties.suburb || ""}</small>`;
                    
                    item.onclick = () => {
                        inputRua.value = f.properties.street || f.properties.name;
                        document.getElementById("bairro").value = f.properties.district || f.properties.suburb || "";
                        latDestino = f.properties.lat;
                        lonDestino = f.properties.lon;
                        sugestaoBox.innerHTML = "";
                        sugestaoBox.style.display = "none";
                        document.getElementById("numero").focus();
                    };
                    sugestaoBox.appendChild(item);
                });
            } else {
                sugestaoBox.style.display = "none";
            }
        } catch (err) { console.error("Erro Geoapify:", err); }
    });

    // Fecha a lista se clicar fora
    document.addEventListener("click", (e) => {
        if (e.target !== inputRua) {
            sugestaoBox.style.display = "none";
        }
    });
}

// --- 4. CÁLCULO DE DISTÂNCIA E TAXA ---
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
    
    // Se o cliente não clicou na sugestão, tentamos buscar as coordenadas agora
    if (!latDestino) {
        document.getElementById("loading-geral").style.display = "flex";
        try {
            const cidade = document.getElementById("cidade").value;
            const busca = encodeURIComponent(`${rua}, ${num} - ${cidade}`);
            const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${busca}&apiKey=${GEOAPIFY_KEY}`);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                latDestino = data.features[0].geometry.coordinates[1];
                lonDestino = data.features[0].geometry.coordinates[0];
            }
        } catch (e) { console.error(e); }
    }

    document.getElementById("loading-geral").style.display = "flex";

    setTimeout(() => {
        try {
            if (latDestino) {
                const dist = calcularDistancia(RESTAURANTE_COORD.lat, RESTAURANTE_COORD.lon, latDestino, lonDestino);
                taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
            } else {
                taxaEntregaCalculada = TAXA_BASE; // Fallback se não achar coordenadas
            }

            if (taxaEntregaCalculada < TAXA_BASE) taxaEntregaCalculada = TAXA_BASE;
            exibirResumoFinal();
        } catch (e) {
            taxaEntregaCalculada = TAXA_BASE;
            exibirResumoFinal();
        } finally {
            document.getElementById("loading-geral").style.display = "none";
        }
    }, 800);
}

function exibirResumoFinal() {
    const box = document.getElementById("resumo-itens");
    box.innerHTML = "";
    let sub = carrinho.reduce((acc, i) => acc + i.price, 0);

    carrinho.forEach(i => {
        box.innerHTML += `<div class="d-flex justify-content-between mb-1"><span>${i.title}</span><span>R$ ${i.price.toFixed(2)}</span></div>`;
    });

    const total = sub + taxaEntregaCalculada - descontoAplicado;
    document.getElementById("resumo-taxa").innerHTML = `
        <div class="d-flex justify-content-between mt-2"><span>Subtotal:</span><span>R$ ${sub.toFixed(2)}</span></div>
        <div class="d-flex justify-content-between text-success fw-bold"><span>Taxa de Entrega:</span><span>R$ ${taxaEntregaCalculada.toFixed(2)}</span></div>
    `;
    document.getElementById("resumo-total").innerText = `Total: R$ ${total.toFixed(2)}`;
    
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

// --- 5. ENVIO FIREBASE ---
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
            observacao: obs,
            horario: new Date().toLocaleString('pt-BR'),
            status: "Pendente"
        });

        alert("🍔 Pedido enviado para o Kings Burger!");
        localStorage.removeItem("carrinho");
        location.reload();
    } catch (err) { alert("Erro ao enviar pedido!"); }
}

// --- 6. FUNÇÕES DO CARRINHO E MODAIS ---
function adicionarAoCarrinho(titulo, preco) {
    carrinho.push({ title: titulo, price: preco });
    atualizarCarrinho();
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
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
        box.innerHTML += `
            <div class="cart-item-row">
                <div class="cart-item-info"><strong>${item.title}</strong><span>R$ ${item.price.toFixed(2)}</span></div>
                <button class="btn-excluir-apenas-x" onclick="removerItem(${index})">✕</button>
            </div>`;
    });
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("total").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length; 
}

function removerItem(idx) { 
    carrinho.splice(idx, 1); 
    atualizarCarrinho(); 
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function abrirCarrinho() { 
    controlarRodape(true);
    document.getElementById("cart-modal").style.display = "flex"; 
}

function fecharCarrinho() { 
    controlarRodape(false);
    document.getElementById("cart-modal").style.display = "none"; 
}

function abrirDelivery() { 
    document.getElementById("cart-modal").style.display = "none";
    document.getElementById("delivery-modal").style.display = "flex"; 
    controlarRodape(true);
}

function fecharDelivery() {
    document.getElementById("delivery-modal").style.display = "none";
    controlarRodape(false);
}

function voltarParaEntrega() { 
    document.getElementById("resumo-pedido").style.display = "none"; 
    document.getElementById("form-entrega").style.display = "block"; 
}

function toggleTroco(val) { 
    document.getElementById("div-troco").style.display = val === "Dinheiro" ? "block" : "none"; 
}

// --- 7. CARREGAMENTO DE DADOS ---
function carregarStatusLoja() { document.getElementById("status-loja").innerText = "ABERTO"; document.getElementById("status-loja").classList.add("aberto"); }

function carregarCarrinhoStorage() { 
    const s = localStorage.getItem("carrinho"); 
    if(s) { carrinho = JSON.parse(s); atualizarCarrinho(); } 
}

async function carregarCardapioCompleto() {
    // Aqui você pode carregar de um JSON ou manter estático
    produtosGeral = [
        {title: "Kings Burger Tradicional", price: 23.99, categoria: "Lanches"},
        {title: "Kings Duplo Bacon", price: 34.99, categoria: "Lanches"},
        {title: "Coca-Cola Lata", price: 6.99, categoria: "Bebida"}
    ];
    renderizarCardapio();
}

function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    if(!corpo) return;
    corpo.innerHTML = "";
    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];
    
    categorias.forEach(cat => {
        const section = document.createElement("section");
        section.innerHTML = `<h2 class="mt-4 mb-3" style="font-size: 18px; font-weight: 800;">${cat.toUpperCase()}</h2>`;
        produtosGeral.filter(p => p.categoria === cat).forEach(p => {
            section.innerHTML += `
                <div class="item-produto-lista" onclick="adicionarAoCarrinho('${p.title}', ${p.price})">
                    <div class="info-produto">
                        <strong>${p.title}</strong>
                        <span>R$ ${p.price.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-warning btn-sm" style="border-radius: 8px; font-weight: bold;">+</button>
                </div>`;
        });
        corpo.appendChild(section);
    });
}
