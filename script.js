// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-49.024909, -26.464334];
const TAXA_BASE = 5;
const VALOR_POR_KM = 4.0;
const WHATSAPP_NUMERO = "5547999999999"; // <-- COLOQUE SEU NÚMERO AQUI

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
    window.addEventListener("scroll", sincronizarScrollMenu);
});

// --- 1. CARREGAMENTO DO CARDÁPIO (JSON) ---
function carregarCardapioCompleto() {
    const corpo = document.getElementById("cardapio-corpo");
    if (!corpo) return;

    fetch('content/produtos.json')
        .then(response => {
            if (!response.ok) throw new Error("Erro ao carregar produtos.json");
            return response.json();
        })
        .then(data => {
            // Acessa a chave "produtos" do seu JSON
            const lista = data.produtos || [];
            
            produtosGeral = lista.map((p, index) => ({
                id: p.id || index,
                title: p.title, 
                price: parseFloat(p.price || 0),
                categoria: p.categoria,
                ingredientes: p.ingredientes || "",
                image: p.image || "imagens/placeholder.png",
                ativo: true
            }));

            renderizarCardapio();
        })
        .catch(error => {
            console.error("Erro:", error);
            corpo.innerHTML = "<p class='text-center mt-5 text-danger'>Erro ao carregar produtos.</p>";
        });
}

// --- 2. RENDERIZAÇÃO NA TELA ---
function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
    
    if(!corpo || !nav) return;
    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];

    categorias.forEach((cat, idx) => {
        // Criar botões do menu superior
        const btn = document.createElement("button");
        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;
        btn.innerText = cat.toUpperCase();
        btn.onclick = () => scrollToCategoria(cat);
        btn.setAttribute("data-categoria", cat);
        nav.appendChild(btn);

        // Criar seção de produtos
        const section = document.createElement("section");
        section.className = "secao-categoria";
        section.id = `secao-${cat}`;
        section.innerHTML = `<h2 class="titulo-categoria">${cat.toUpperCase()}</h2>`;

        produtosGeral.filter(p => p.categoria === cat).forEach(p => {
            section.innerHTML += `
                <div class="item-produto-lista" onclick="adicionarAoCarrinho('${p.title}', ${p.price})">
                    <div class="info-produto">
                        <h3>${p.title}</h3>
                        <p>${p.ingredientes}</p>
                        <span class="preco-unico">R$ ${p.price.toFixed(2)}</span>
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

// --- 3. LÓGICA DO CARRINHO ---
function adicionarAoCarrinho(titulo, preco) {
    carrinho.push({ title: titulo, price: preco });
    atualizarCarrinho();
    mostrarToast(titulo);
}

function atualizarCarrinho() {
    const box = document.getElementById("cart-items");
    const count = document.getElementById("cart-count");
    if(!box) return;
    
    box.innerHTML = "";
    let sub = 0;

    carrinho.forEach((item, index) => {
        sub += item.price;
        box.innerHTML += `
            <div class="cart-item-row">
                <div style="flex:1">
                    <strong>${item.title}</strong><br>
                    <small>R$ ${item.price.toFixed(2)}</small>
                </div>
                <button onclick="removerItem(${index})" class="btn-excluir-apenas-x">X</button>
            </div>`;
    });

    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("total").innerText = `R$ ${sub.toFixed(2)}`;
    if(count) count.innerText = carrinho.length;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    atualizarCarrinho();
}

// --- 4. GEO E ENTREGA ---
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente").value;
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;

    if (!nome || !rua || !num) return alert("Preencha Nome, Rua e Número!");

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex";

    try {
        const query = encodeURIComponent(`${rua}, ${num}, Guaramirim, SC, Brasil`);
        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();

        if (data.features && data.features.length > 0) {
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

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function mostrarResumoFinal() {
    const resumoItens = document.getElementById("resumo-itens");
    resumoItens.innerHTML = "";
    let sub = 0;
    carrinho.forEach(i => {
        sub += i.price;
        resumoItens.innerHTML += `<div class="resumo-linha"><span>${i.title}</span> <span>R$ ${i.price.toFixed(2)}</span></div>`;
    });
    
    const totalFinal = sub + taxaEntregaCalculada;
    document.getElementById("resumo-taxa").innerHTML = `Subtotal: R$ ${sub.toFixed(2)}<br>Entrega: R$ ${taxaEntregaCalculada.toFixed(2)}`;
    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

// --- 5. FIREBASE E WHATSAPP ---
async function enviarPedidoFinal() {
    const nome = document.getElementById("nomeCliente").value;
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;
    const pag = document.getElementById("pagamento").value;
    const fone = document.getElementById("celularCliente").value;

    const subtotal = carrinho.reduce((acc, i) => acc + i.price, 0);
    const total = subtotal + taxaEntregaCalculada;

    const dadosPedido = {
        cliente: nome,
        telefone: fone,
        endereco: `${rua}, ${num} - ${bairro}`,
        pagamento: pag,
        status: "pendente",
        itens: carrinho.map(i => ({ produto: i.title, qtd: 1, precoUn: i.price })),
        subtotal: subtotal,
        taxaEntrega: taxaEntregaCalculada,
        total: total,
        horario: new Date().toLocaleTimeString('pt-BR')
    };

    try {
        // SALVA NO FIREBASE
        const novoPedidoRef = db.ref('pedidos_kings').push();
        await novoPedidoRef.set(dadosPedido);
        localStorage.setItem('ultimoPedidoId', novoPedidoRef.key);

        // MENSAGEM WHATSAPP
        let msg = `*NOVO PEDIDO*\nCliente: ${nome}\nEndereço: ${rua}, ${num}\nTotal: R$ ${total.toFixed(2)}`;
        window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`);

        alert("Pedido Enviado com Sucesso!");
        carrinho = [];
        localStorage.removeItem("carrinho");
        location.reload();
    } catch (e) {
        alert("Erro ao salvar no Firebase.");
    }
}

// --- UI / AUXILIARES ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    const hora = new Date().getHours();
    const aberto = hora >= 18 && hora < 24;
    el.innerText = aberto ? "ABERTO" : "FECHADO";
    el.className = `status ${aberto ? 'aberto' : 'fechado'}`;
}

function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }
function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }
function abrirDelivery() { 
    if(carrinho.length === 0) return;
    fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex"; 
}
function fecharModalEntrega() { document.getElementById('delivery-modal').style.display = 'none'; }
function mostrarToast(t) { 
    const el = document.getElementById("toast-geral");
    el.innerText = t + " adicionado! ✅"; el.style.display = "block";
    setTimeout(() => el.style.display = "none", 2000);
}
function carregarCarrinhoStorage() {
    const s = localStorage.getItem("carrinho");
    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }
}
function scrollToCategoria(cat) {
    const el = document.getElementById(`secao-${cat}`);
    if(el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}
function sincronizarScrollMenu() {
    const secoes = document.querySelectorAll(".secao-categoria");
    const botoes = document.querySelectorAll(".cat-item");
    let atual = "";
    secoes.forEach(s => { if (window.pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });
    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));
}
function toggleTroco(val) {
    document.getElementById("div-troco").style.display = val === "Dinheiro" ? "block" : "none";
}
function mostrarTela(tela) {
    document.getElementById('cardapio-corpo').style.display = tela === 'inicio' ? 'block' : 'none';
    document.getElementById('categorias-nav').style.display = tela === 'inicio' ? 'block' : 'none';
    document.getElementById('view-pedidos').style.display = tela === 'pedidos' ? 'block' : 'none';
}
