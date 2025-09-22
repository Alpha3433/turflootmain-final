"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[9680],{69680:function(e,t,o){o.r(t),o.d(t,{AppKitModal:function(){return eL},W3mModal:function(){return ej},W3mModalBase:function(){return eM},W3mRouterContainer:function(){return eV}});var r=o(56545),a=o(76547),i=o(21045),n=o(51561),s=o(97105),l=o(8171),c=o(96238),d=o(20227),u=o(99420),p=o(29748),w=o(56854),m=o(73668),h=o(53064);let g={isUnsupportedChainView:()=>"UnsupportedChain"===w.RouterController.state.view||"SwitchNetwork"===w.RouterController.state.view&&w.RouterController.state.history.includes("UnsupportedChain"),async safeClose(){if(this.isUnsupportedChainView()||await h.w.isSIWXCloseDisabled()){c.I.shake();return}("DataCapture"===w.RouterController.state.view||"DataCaptureOtpConfirm"===w.RouterController.state.view)&&m.ConnectionController.disconnect(),c.I.close()}};var y=o(2059),f=o(13465),b=o(22837),v=o(87481),k=o(10164),C=o(86924),T=o(63768),x=o(13756),S=o(93449),A=o(2428),P=o(82833);let $={getGasPriceInEther:(e,t)=>Number(t*e)/1e18,getGasPriceInUSD(e,t,o){let r=$.getGasPriceInEther(t,o);return C.C.bigNumber(e).times(r).toNumber()},getPriceImpact({sourceTokenAmount:e,sourceTokenPriceInUSD:t,toTokenPriceInUSD:o,toTokenAmount:r}){let a=C.C.bigNumber(e).times(t),i=C.C.bigNumber(r).times(o);return a.minus(i).div(a).times(100).toNumber()},getMaxSlippage(e,t){let o=C.C.bigNumber(e).div(100);return C.C.multiply(t,o).toNumber()},getProviderFee:(e,t=.0085)=>C.C.bigNumber(e).times(t).toString(),isInsufficientNetworkTokenForGas:(e,t)=>!!C.C.bigNumber(e).eq(0)||C.C.bigNumber(C.C.bigNumber(t||"0")).gt(e),isInsufficientSourceTokenForSwap(e,t,o){let r=o?.find(e=>e.address===t)?.quantity?.numeric;return C.C.bigNumber(r||"0").lt(e)}};var R=o(71302),E=o(34249),N=o(4655),I=o(55853),O=o(93388);let W={initializing:!1,initialized:!1,loadingPrices:!1,loadingQuote:!1,loadingApprovalTransaction:!1,loadingBuildTransaction:!1,loadingTransaction:!1,fetchError:!1,approvalTransaction:void 0,swapTransaction:void 0,transactionError:void 0,sourceToken:void 0,sourceTokenAmount:"",sourceTokenPriceInUSD:0,toToken:void 0,toTokenAmount:"",toTokenPriceInUSD:0,networkPrice:"0",networkBalanceInUSD:"0",networkTokenSymbol:"",inputError:void 0,slippage:A.bq.CONVERT_SLIPPAGE_TOLERANCE,tokens:void 0,popularTokens:void 0,suggestedTokens:void 0,foundTokens:void 0,myTokensWithBalance:void 0,tokensPriceMap:{},gasFee:"0",gasPriceInUSD:0,priceImpact:void 0,maxSlippage:void 0,providerFee:void 0},B=(0,v.sj)({...W}),D={state:B,subscribe:e=>(0,v.Ld)(B,()=>e(B)),subscribeKey:(e,t)=>(0,k.VW)(B,e,t),getParams(){let e=d.R.state.activeChain,t=E.AccountController.getCaipAddress(e)??d.R.state.activeCaipAddress,o=b.j.getPlainAddress(t),r=(0,S.EO)(),a=u.ConnectorController.getConnectorId(d.R.state.activeChain);if(!o)throw Error("No address found to swap the tokens from.");let i=!B.toToken?.address||!B.toToken?.decimals,n=!B.sourceToken?.address||!B.sourceToken?.decimals||!C.C.bigNumber(B.sourceTokenAmount).gt(0),l=!B.sourceTokenAmount;return{networkAddress:r,fromAddress:o,fromCaipAddress:t,sourceTokenAddress:B.sourceToken?.address,toTokenAddress:B.toToken?.address,toTokenAmount:B.toTokenAmount,toTokenDecimals:B.toToken?.decimals,sourceTokenAmount:B.sourceTokenAmount,sourceTokenDecimals:B.sourceToken?.decimals,invalidToToken:i,invalidSourceToken:n,invalidSourceTokenAmount:l,availableToSwap:t&&!i&&!n&&!l,isAuthConnector:a===s.b.CONNECTOR_ID.AUTH}},setSourceToken(e){if(!e){B.sourceToken=e,B.sourceTokenAmount="",B.sourceTokenPriceInUSD=0;return}B.sourceToken=e,z.setTokenPrice(e.address,"sourceToken")},setSourceTokenAmount(e){B.sourceTokenAmount=e},setToToken(e){if(!e){B.toToken=e,B.toTokenAmount="",B.toTokenPriceInUSD=0;return}B.toToken=e,z.setTokenPrice(e.address,"toToken")},setToTokenAmount(e){B.toTokenAmount=e?C.C.toFixed(e,6):""},async setTokenPrice(e,t){let o=B.tokensPriceMap[e]||0;o||(B.loadingPrices=!0,o=await z.getAddressPrice(e)),"sourceToken"===t?B.sourceTokenPriceInUSD=o:"toToken"===t&&(B.toTokenPriceInUSD=o),B.loadingPrices&&(B.loadingPrices=!1),z.getParams().availableToSwap&&z.swapTokens()},switchTokens(){if(B.initializing||!B.initialized)return;let e=B.toToken?{...B.toToken}:void 0,t=B.sourceToken?{...B.sourceToken}:void 0,o=e&&""===B.toTokenAmount?"1":B.toTokenAmount;z.setSourceToken(e),z.setToToken(t),z.setSourceTokenAmount(o),z.setToTokenAmount(""),z.swapTokens()},resetState(){B.myTokensWithBalance=W.myTokensWithBalance,B.tokensPriceMap=W.tokensPriceMap,B.initialized=W.initialized,B.initializing=W.initializing,B.sourceToken=W.sourceToken,B.sourceTokenAmount=W.sourceTokenAmount,B.sourceTokenPriceInUSD=W.sourceTokenPriceInUSD,B.toToken=W.toToken,B.toTokenAmount=W.toTokenAmount,B.toTokenPriceInUSD=W.toTokenPriceInUSD,B.networkPrice=W.networkPrice,B.networkTokenSymbol=W.networkTokenSymbol,B.networkBalanceInUSD=W.networkBalanceInUSD,B.inputError=W.inputError},resetValues(){let{networkAddress:e}=z.getParams(),t=B.tokens?.find(t=>t.address===e);z.setSourceToken(t),z.setToToken(void 0)},getApprovalLoadingState:()=>B.loadingApprovalTransaction,clearError(){B.transactionError=void 0},async initializeState(){if(!B.initializing){if(B.initializing=!0,!B.initialized)try{await z.fetchTokens(),B.initialized=!0}catch(e){B.initialized=!1,f.SnackController.showError("Failed to initialize swap"),w.RouterController.goBack()}B.initializing=!1}},async fetchTokens(){let{networkAddress:e}=z.getParams();await z.getNetworkTokenPrice(),await z.getMyTokensWithBalance();let t=B.myTokensWithBalance?.find(t=>t.address===e);t&&(B.networkTokenSymbol=t.symbol,z.setSourceToken(t),z.setSourceTokenAmount("0"))},async getTokenList(){let e=d.R.state.activeCaipNetwork?.caipNetworkId;if(B.caipNetworkId!==e||!B.tokens)try{B.tokensLoading=!0;let t=await P.n.getTokenList(e);B.tokens=t,B.caipNetworkId=e,B.popularTokens=t.sort((e,t)=>e.symbol<t.symbol?-1:e.symbol>t.symbol?1:0),B.suggestedTokens=t.filter(e=>!!A.bq.SWAP_SUGGESTED_TOKENS.includes(e.symbol))}catch(e){B.tokens=[],B.popularTokens=[],B.suggestedTokens=[]}finally{B.tokensLoading=!1}},async getAddressPrice(e){let t=B.tokensPriceMap[e];if(t)return t;let o=await I.L.fetchTokenPrice({addresses:[e]}),r=o?.fungibles||[],a=[...B.tokens||[],...B.myTokensWithBalance||[]],i=a?.find(t=>t.address===e)?.symbol,n=parseFloat((r.find(e=>e.symbol.toLowerCase()===i?.toLowerCase())?.price||0).toString());return B.tokensPriceMap[e]=n,n},async getNetworkTokenPrice(){let{networkAddress:e}=z.getParams(),t=await I.L.fetchTokenPrice({addresses:[e]}).catch(()=>(f.SnackController.showError("Failed to fetch network token price"),{fungibles:[]})),o=t.fungibles?.[0],r=o?.price.toString()||"0";B.tokensPriceMap[e]=parseFloat(r),B.networkTokenSymbol=o?.symbol||"",B.networkPrice=r},async getMyTokensWithBalance(e){let t=await x.Q.getMyTokensWithBalance(e),o=P.n.mapBalancesToSwapTokens(t);o&&(await z.getInitialGasPrice(),z.setBalances(o))},setBalances(e){let{networkAddress:t}=z.getParams(),o=d.R.state.activeCaipNetwork;if(!o)return;let r=e.find(e=>e.address===t);e.forEach(e=>{B.tokensPriceMap[e.address]=e.price||0}),B.myTokensWithBalance=e.filter(e=>e.address.startsWith(o.caipNetworkId)),B.networkBalanceInUSD=r?C.C.multiply(r.quantity.numeric,r.price).toString():"0"},async getInitialGasPrice(){let e=await P.n.fetchGasPrice();if(!e)return{gasPrice:null,gasPriceInUSD:null};switch(d.R.state?.activeCaipNetwork?.chainNamespace){case s.b.CHAIN.SOLANA:return B.gasFee=e.standard??"0",B.gasPriceInUSD=C.C.multiply(e.standard,B.networkPrice).div(1e9).toNumber(),{gasPrice:BigInt(B.gasFee),gasPriceInUSD:Number(B.gasPriceInUSD)};case s.b.CHAIN.EVM:default:let t=e.standard??"0",o=BigInt(t),r=BigInt(15e4),a=$.getGasPriceInUSD(B.networkPrice,r,o);return B.gasFee=t,B.gasPriceInUSD=a,{gasPrice:o,gasPriceInUSD:a}}},async swapTokens(){let e=E.AccountController.state.address,t=B.sourceToken,o=B.toToken,r=C.C.bigNumber(B.sourceTokenAmount).gt(0);if(r||z.setToTokenAmount(""),!o||!t||B.loadingPrices||!r)return;B.loadingQuote=!0;let a=C.C.bigNumber(B.sourceTokenAmount).times(10**t.decimals).round(0);try{let r=await I.L.fetchSwapQuote({userAddress:e,from:t.address,to:o.address,gasPrice:B.gasFee,amount:a.toString()});B.loadingQuote=!1;let i=r?.quotes?.[0]?.toAmount;if(!i){N.AlertController.open({displayMessage:"Incorrect amount",debugMessage:"Please enter a valid amount"},"error");return}let n=C.C.bigNumber(i).div(10**o.decimals).toString();z.setToTokenAmount(n),z.hasInsufficientToken(B.sourceTokenAmount,t.address)?B.inputError="Insufficient balance":(B.inputError=void 0,z.setTransactionDetails())}catch(e){B.loadingQuote=!1,B.inputError="Insufficient balance"}},async getTransaction(){let{fromCaipAddress:e,availableToSwap:t}=z.getParams(),o=B.sourceToken,r=B.toToken;if(e&&t&&o&&r&&!B.loadingQuote)try{let t;return B.loadingBuildTransaction=!0,t=await P.n.fetchSwapAllowance({userAddress:e,tokenAddress:o.address,sourceTokenAmount:B.sourceTokenAmount,sourceTokenDecimals:o.decimals})?await z.createSwapTransaction():await z.createAllowanceTransaction(),B.loadingBuildTransaction=!1,B.fetchError=!1,t}catch(e){w.RouterController.goBack(),f.SnackController.showError("Failed to check allowance"),B.loadingBuildTransaction=!1,B.approvalTransaction=void 0,B.swapTransaction=void 0,B.fetchError=!0;return}},async createAllowanceTransaction(){let{fromCaipAddress:e,sourceTokenAddress:t,toTokenAddress:o}=z.getParams();if(e&&o){if(!t)throw Error("createAllowanceTransaction - No source token address found.");try{let r=await I.L.generateApproveCalldata({from:t,to:o,userAddress:e}),a=b.j.getPlainAddress(r.tx.from);if(!a)throw Error("SwapController:createAllowanceTransaction - address is required");let i={data:r.tx.data,to:a,gasPrice:BigInt(r.tx.eip155.gasPrice),value:BigInt(r.tx.value),toAmount:B.toTokenAmount};return B.swapTransaction=void 0,B.approvalTransaction={data:i.data,to:i.to,gasPrice:i.gasPrice,value:i.value,toAmount:i.toAmount},{data:i.data,to:i.to,gasPrice:i.gasPrice,value:i.value,toAmount:i.toAmount}}catch(e){w.RouterController.goBack(),f.SnackController.showError("Failed to create approval transaction"),B.approvalTransaction=void 0,B.swapTransaction=void 0,B.fetchError=!0;return}}},async createSwapTransaction(){let{networkAddress:e,fromCaipAddress:t,sourceTokenAmount:o}=z.getParams(),r=B.sourceToken,a=B.toToken;if(!t||!o||!r||!a)return;let i=m.ConnectionController.parseUnits(o,r.decimals)?.toString();try{let o=await I.L.generateSwapCalldata({userAddress:t,from:r.address,to:a.address,amount:i,disableEstimate:!0}),n=r.address===e,s=BigInt(o.tx.eip155.gas),l=BigInt(o.tx.eip155.gasPrice),c=b.j.getPlainAddress(o.tx.to);if(!c)throw Error("SwapController:createSwapTransaction - address is required");let d={data:o.tx.data,to:c,gas:s,gasPrice:l,value:n?BigInt(i??"0"):BigInt("0"),toAmount:B.toTokenAmount};return B.gasPriceInUSD=$.getGasPriceInUSD(B.networkPrice,s,l),B.approvalTransaction=void 0,B.swapTransaction=d,d}catch(e){w.RouterController.goBack(),f.SnackController.showError("Failed to create transaction"),B.approvalTransaction=void 0,B.swapTransaction=void 0,B.fetchError=!0;return}},onEmbeddedWalletApprovalSuccess(){f.SnackController.showLoading("Approve limit increase in your wallet"),w.RouterController.replace("SwapPreview")},async sendTransactionForApproval(e){let{fromAddress:t,isAuthConnector:o}=z.getParams();B.loadingApprovalTransaction=!0,o?w.RouterController.pushTransactionStack({onSuccess:z.onEmbeddedWalletApprovalSuccess}):f.SnackController.showLoading("Approve limit increase in your wallet");try{await m.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:s.b.CHAIN.EVM}),await z.swapTokens(),await z.getTransaction(),B.approvalTransaction=void 0,B.loadingApprovalTransaction=!1}catch(e){B.transactionError=e?.displayMessage,B.loadingApprovalTransaction=!1,f.SnackController.showError(e?.displayMessage||"Transaction error"),O.X.sendEvent({type:"track",event:"SWAP_APPROVAL_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:d.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:z.state.sourceToken?.symbol||"",swapToToken:z.state.toToken?.symbol||"",swapFromAmount:z.state.sourceTokenAmount||"",swapToAmount:z.state.toTokenAmount||"",isSmartAccount:(0,S.r9)(s.b.CHAIN.EVM)===T.y_.ACCOUNT_TYPES.SMART_ACCOUNT}})}},async sendTransactionForSwap(e){if(!e)return;let{fromAddress:t,toTokenAmount:o,isAuthConnector:r}=z.getParams();B.loadingTransaction=!0;let a=`Swapping ${B.sourceToken?.symbol} to ${C.C.formatNumberToLocalString(o,3)} ${B.toToken?.symbol}`,i=`Swapped ${B.sourceToken?.symbol} to ${C.C.formatNumberToLocalString(o,3)} ${B.toToken?.symbol}`;r?w.RouterController.pushTransactionStack({onSuccess(){w.RouterController.replace("Account"),f.SnackController.showLoading(a),D.resetState()}}):f.SnackController.showLoading("Confirm transaction in your wallet");try{let o=[B.sourceToken?.address,B.toToken?.address].join(","),a=await m.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:s.b.CHAIN.EVM});return B.loadingTransaction=!1,f.SnackController.showSuccess(i),O.X.sendEvent({type:"track",event:"SWAP_SUCCESS",properties:{network:d.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:z.state.sourceToken?.symbol||"",swapToToken:z.state.toToken?.symbol||"",swapFromAmount:z.state.sourceTokenAmount||"",swapToAmount:z.state.toTokenAmount||"",isSmartAccount:(0,S.r9)(s.b.CHAIN.EVM)===T.y_.ACCOUNT_TYPES.SMART_ACCOUNT}}),D.resetState(),r||w.RouterController.replace("Account"),D.getMyTokensWithBalance(o),a}catch(e){B.transactionError=e?.displayMessage,B.loadingTransaction=!1,f.SnackController.showError(e?.displayMessage||"Transaction error"),O.X.sendEvent({type:"track",event:"SWAP_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:d.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:z.state.sourceToken?.symbol||"",swapToToken:z.state.toToken?.symbol||"",swapFromAmount:z.state.sourceTokenAmount||"",swapToAmount:z.state.toTokenAmount||"",isSmartAccount:(0,S.r9)(s.b.CHAIN.EVM)===T.y_.ACCOUNT_TYPES.SMART_ACCOUNT}});return}},hasInsufficientToken:(e,t)=>$.isInsufficientSourceTokenForSwap(e,t,B.myTokensWithBalance),setTransactionDetails(){let{toTokenAddress:e,toTokenDecimals:t}=z.getParams();e&&t&&(B.gasPriceInUSD=$.getGasPriceInUSD(B.networkPrice,BigInt(B.gasFee),BigInt(15e4)),B.priceImpact=$.getPriceImpact({sourceTokenAmount:B.sourceTokenAmount,sourceTokenPriceInUSD:B.sourceTokenPriceInUSD,toTokenPriceInUSD:B.toTokenPriceInUSD,toTokenAmount:B.toTokenAmount}),B.maxSlippage=$.getMaxSlippage(B.slippage,B.toTokenAmount),B.providerFee=$.getProviderFee(B.sourceTokenAmount))}},z=(0,R.P)(D);var U=o(20425),F=o(52550),M=o(236),j=o(39629),L=(0,j.iv)`
  :host {
    display: block;
    border-radius: clamp(0px, ${({borderRadius:e})=>e["8"]}, 44px);
    box-shadow: 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    overflow: hidden;
  }
`;let _=class extends r.oi{render(){return(0,r.dy)`<slot></slot>`}};_.styles=[F.ET,L],_=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n}([(0,M.M)("wui-card")],_),o(72110),o(54873),o(89683),o(75363);var H=(0,j.iv)`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[6]};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  :host > wui-flex[data-type='info'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};

      wui-icon {
        color: ${({tokens:e})=>e.theme.iconDefault};
      }
    }
  }
  :host > wui-flex[data-type='success'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderSuccess};
      }
    }
  }
  :host > wui-flex[data-type='warning'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundWarning};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderWarning};
      }
    }
  }
  :host > wui-flex[data-type='error'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundError};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderError};
      }
    }
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e["2"]};
    background-color: var(--local-icon-bg-value);
  }
`,V=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let K={info:"info",success:"checkmark",warning:"warningCircle",error:"warning"},X=class extends r.oi{constructor(){super(...arguments),this.message="",this.type="info"}render(){return(0,r.dy)`
      <wui-flex
        data-type=${(0,i.o)(this.type)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="2"
      >
        <wui-flex columnGap="2" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color="inherit" size="md" name=${K[this.type]}></wui-icon>
          </wui-flex>
          <wui-text variant="md-medium" color="inherit" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="inherit"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){N.AlertController.close()}};X.styles=[F.ET,H],V([(0,a.Cb)()],X.prototype,"message",void 0),V([(0,a.Cb)()],X.prototype,"type",void 0),X=V([(0,M.M)("wui-alertbar")],X);var G=(0,U.iv)`
  :host {
    display: block;
    position: absolute;
    top: ${({spacing:e})=>e["3"]};
    left: ${({spacing:e})=>e["4"]};
    right: ${({spacing:e})=>e["4"]};
    opacity: 0;
    pointer-events: none;
  }
`,Y=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let q={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"warning"}},Q=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.open=N.AlertController.state.open,this.onOpen(!0),this.unsubscribe.push(N.AlertController.subscribeKey("open",e=>{this.open=e,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=N.AlertController.state,o=q[t];return(0,r.dy)`
      <wui-alertbar
        message=${e}
        backgroundColor=${o?.backgroundColor}
        iconColor=${o?.iconColor}
        icon=${o?.icon}
        type=${t}
      ></wui-alertbar>
    `}onOpen(e){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):e||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};Q.styles=G,Y([(0,a.SB)()],Q.prototype,"open",void 0),Q=Y([(0,U.Mo)("w3m-alertbar")],Q);var Z=o(41077),J=o(7719),ee=(0,j.iv)`
  button {
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button[data-variant='accent']:hover:enabled,
  button[data-variant='accent']:focus-visible {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='primary']:hover:enabled,
  button[data-variant='primary']:focus-visible,
  button[data-variant='secondary']:hover:enabled,
  button[data-variant='secondary']:focus-visible {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button[data-size='xs'] > wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='xs'],
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'],
  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='md'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button:disabled {
    background-color: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:hover:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
  }

  button:focus-visible:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
`,et=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eo=class extends r.oi{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="default",this.variant="accent"}render(){return(0,r.dy)`
      <button data-variant=${this.variant} ?disabled=${this.disabled} data-size=${this.size}>
        <wui-icon
          color=${({accent:"accent-primary",primary:"inverse",secondary:"default"})[this.variant]||this.iconColor}
          size=${this.size}
          name=${this.icon}
        ></wui-icon>
      </button>
    `}};eo.styles=[F.ET,F.ZM,ee],et([(0,a.Cb)()],eo.prototype,"size",void 0),et([(0,a.Cb)({type:Boolean})],eo.prototype,"disabled",void 0),et([(0,a.Cb)()],eo.prototype,"icon",void 0),et([(0,a.Cb)()],eo.prototype,"iconColor",void 0),et([(0,a.Cb)()],eo.prototype,"variant",void 0),eo=et([(0,M.M)("wui-icon-link")],eo),o(65547);var er=(0,j.iv)`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    border-radius: ${({borderRadius:e})=>e[32]};
  }

  wui-image {
    border-radius: 100%;
  }

  wui-text {
    padding-left: ${({spacing:e})=>e[1]};
  }

  .left-icon-container,
  .right-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-type='filled-dropdown'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-type='text-dropdown'] {
    background-color: transparent;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    opacity: 0.5;
  }
`,ea=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let ei={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},en={lg:"lg",md:"md",sm:"sm"},es=class extends r.oi{constructor(){super(...arguments),this.imageSrc="",this.text="",this.size="lg",this.type="text-dropdown",this.disabled=!1}render(){return(0,r.dy)`<button ?disabled=${this.disabled} data-size=${this.size} data-type=${this.type}>
      ${this.imageTemplate()} ${this.textTemplate()}
      <wui-flex class="right-icon-container">
        <wui-icon name="chevronBottom"></wui-icon>
      </wui-flex>
    </button>`}textTemplate(){let e=ei[this.size];return this.text?(0,r.dy)`<wui-text color="primary" variant=${e}>${this.text}</wui-text>`:null}imageTemplate(){if(this.imageSrc)return(0,r.dy)`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`;let e=en[this.size];return(0,r.dy)` <wui-flex class="left-icon-container">
      <wui-icon size=${e} name="networkPlaceholder"></wui-icon>
    </wui-flex>`}};es.styles=[F.ET,F.ZM,er],ea([(0,a.Cb)()],es.prototype,"imageSrc",void 0),ea([(0,a.Cb)()],es.prototype,"text",void 0),ea([(0,a.Cb)()],es.prototype,"size",void 0),ea([(0,a.Cb)()],es.prototype,"type",void 0),ea([(0,a.Cb)({type:Boolean})],es.prototype,"disabled",void 0),es=ea([(0,M.M)("wui-select")],es),o(58868),o(58643);var el=o(59930),ec=(0,U.iv)`
  :host {
    height: 60px;
  }

  :host > wui-flex {
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  wui-text {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-down-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-up-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-icon-link[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`,ed=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eu=["SmartSessionList"];function ep(){let e=w.RouterController.state.data?.connector?.name,t=w.RouterController.state.data?.wallet?.name,o=w.RouterController.state.data?.network?.name,r=t??e,a=u.ConnectorController.getConnectors(),i=1===a.length&&a[0]?.id==="w3m-email";return{Connect:`Connect ${i?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",ConnectingExternal:r??"Connect Wallet",ConnectingWalletConnect:r??"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview Convert",Downloads:r?`Get ${r}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a Wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",ProfileWallets:"Wallets",SwitchNetwork:o??"Switch Network",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade Your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose Name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select Token",SwapPreview:"Preview Swap",WalletSend:"Send",WalletSendPreview:"Review Send",WalletSendSelectToken:"Select Token",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a Wallet?",ConnectWallets:"Connect Wallet",ConnectSocials:"All Socials",ConnectingSocial:E.AccountController.state.socialProvider?E.AccountController.state.socialProvider.charAt(0).toUpperCase()+E.AccountController.state.socialProvider.slice(1):"Connect Social",ConnectingMultiChain:"Select Chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch Chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Payment in Progress",DataCapture:"Profile",DataCaptureOtpConfirm:"Confirm Email",FundWallet:"Fund Wallet",PayWithExchange:"Deposit from an Exchange",PayWithExchangeSelectAsset:"Select Asset"}}let ew=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.heading=ep()[w.RouterController.state.view],this.network=d.R.state.activeCaipNetwork,this.networkImage=Z.f.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=w.RouterController.state.view,this.viewDirection="",this.unsubscribe.push(J.W.subscribeNetworkImages(()=>{this.networkImage=Z.f.getNetworkImage(this.network)}),w.RouterController.subscribeKey("view",e=>{setTimeout(()=>{this.view=e,this.heading=ep()[e]},el.b.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),d.R.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=Z.f.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){return(0,r.dy)`
      <wui-flex
        .padding=${["0","5","0","5"]}
        justifyContent="space-between"
        alignItems="center"
      >
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){O.X.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),w.RouterController.push("WhatIsAWallet")}async onClose(){await g.safeClose()}rightHeaderTemplate(){let e=l.OptionsController?.state?.features?.smartSessions;return"Account"===w.RouterController.state.view&&e?(0,r.dy)`<wui-flex>
      <wui-icon-link
        icon="clock"
        variant="primary"
        @click=${()=>w.RouterController.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-link>
      ${this.closeButtonTemplate()}
    </wui-flex> `:this.closeButtonTemplate()}closeButtonTemplate(){return(0,r.dy)`
      <wui-icon-link
        icon="close"
        variant="primary"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-link>
    `}titleTemplate(){let e=eu.includes(this.view);return(0,r.dy)`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="2"
      >
        <wui-text variant="lg-regular" color="primary" data-testid="w3m-header-text">
          ${this.heading}
        </wui-text>
        ${e?(0,r.dy)`<wui-tag variant="accent" size="md">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){let{view:e}=w.RouterController.state,t="Connect"===e,o=l.OptionsController.state.enableEmbedded,a=l.OptionsController.state.enableNetworkSwitch;return"Account"===e&&a?(0,r.dy)`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${(0,i.o)(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${(0,i.o)(this.networkImage)}
      ></wui-select>`:this.showBack&&!("ApproveTransaction"===e||"ConnectingSiwe"===e||t&&o)?(0,r.dy)`<wui-icon-link
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        variant="primary"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-link>`:(0,r.dy)`<wui-icon-link
      data-hidden=${!t}
      id="dynamic"
      icon="helpCircle"
      variant="primary"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-link>`}onNetworks(){this.isAllowedNetworkSwitch()&&(O.X.sendEvent({type:"track",event:"CLICK_NETWORKS"}),w.RouterController.push("Networks"))}isAllowedNetworkSwitch(){let e=d.R.getAllRequestedCaipNetworks(),t=!!e&&e.length>1,o=e?.find(({id:e})=>e===this.network?.id);return t||!o}onViewChange(){let{history:e}=w.RouterController.state,t=el.b.VIEW_DIRECTION.Next;e.length<this.prevHistoryLength&&(t=el.b.VIEW_DIRECTION.Prev),this.prevHistoryLength=e.length,this.viewDirection=t}async onHistoryChange(){let{history:e}=w.RouterController.state,t=this.shadowRoot?.querySelector("#dynamic");e.length>1&&!this.showBack&&t?(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):e.length<=1&&this.showBack&&t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){w.RouterController.goBack()}};ew.styles=ec,ed([(0,a.SB)()],ew.prototype,"heading",void 0),ed([(0,a.SB)()],ew.prototype,"network",void 0),ed([(0,a.SB)()],ew.prototype,"networkImage",void 0),ed([(0,a.SB)()],ew.prototype,"showBack",void 0),ed([(0,a.SB)()],ew.prototype,"prevHistoryLength",void 0),ed([(0,a.SB)()],ew.prototype,"view",void 0),ed([(0,a.SB)()],ew.prototype,"viewDirection",void 0),ew=ed([(0,U.Mo)("w3m-header")],ew),o(66903),o(99597);var em=(0,j.iv)`
  :host {
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[2]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow:
      0px 0px 8px 0px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px ${({tokens:e})=>e.theme.borderPrimary};
    max-width: 320px;
  }

  wui-icon-box {
    border-radius: ${({borderRadius:e})=>e.round} !important;
    overflow: hidden;
  }

  wui-loading-spinner {
    padding: ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    border-radius: ${({borderRadius:e})=>e.round} !important;
  }
`,eh=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eg=class extends r.oi{constructor(){super(...arguments),this.message="",this.variant="success"}render(){return(0,r.dy)`
      ${this.templateIcon()}
      <wui-text variant="lg-regular" color="primary" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){return"loading"===this.variant?(0,r.dy)`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:(0,r.dy)`<wui-icon-box
      size="md"
      color=${({success:"success",error:"error",warning:"warning",info:"default"})[this.variant]}
      icon=${({success:"checkmark",error:"warning",warning:"warningCircle",info:"info"})[this.variant]}
    ></wui-icon-box>`}};eg.styles=[F.ET,em],eh([(0,a.Cb)()],eg.prototype,"message",void 0),eh([(0,a.Cb)()],eg.prototype,"variant",void 0),eg=eh([(0,M.M)("wui-snackbar")],eg);var ey=(0,r.iv)`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`,ef=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eb=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=f.SnackController.state.open,this.unsubscribe.push(f.SnackController.subscribeKey("open",e=>{this.open=e,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=f.SnackController.state;return(0,r.dy)` <wui-snackbar message=${e} variant=${t}></wui-snackbar> `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),f.SnackController.state.autoClose&&(this.timeout=setTimeout(()=>f.SnackController.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};eb.styles=ey,ef([(0,a.SB)()],eb.prototype,"open",void 0),eb=ef([(0,U.Mo)("w3m-snackbar")],eb);let ev=(0,v.sj)({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),ek=(0,R.P)({state:ev,subscribe:e=>(0,v.Ld)(ev,()=>e(ev)),subscribeKey:(e,t)=>(0,k.VW)(ev,e,t),showTooltip({message:e,triggerRect:t,variant:o}){ev.open=!0,ev.message=e,ev.triggerRect=t,ev.variant=o},hide(){ev.open=!1,ev.message="",ev.triggerRect={width:0,height:0,top:0,left:0}}});o(21508);var eC=(0,U.iv)`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:e})=>e["3"]} 10px ${({spacing:e})=>e["3"]};
    border-radius: ${({borderRadius:e})=>e["3"]};
    color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:e})=>e["5"]});
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.textPrimary};
    border: none;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`,eT=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let ex=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.open=ek.state.open,this.message=ek.state.message,this.triggerRect=ek.state.triggerRect,this.variant=ek.state.variant,this.unsubscribe.push(ek.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;let e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${this.open?1:0};
    `,(0,r.dy)`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};ex.styles=[eC],eT([(0,a.SB)()],ex.prototype,"open",void 0),eT([(0,a.SB)()],ex.prototype,"message",void 0),eT([(0,a.SB)()],ex.prototype,"triggerRect",void 0),eT([(0,a.SB)()],ex.prototype,"variant",void 0),ex=eT([(0,U.Mo)("w3m-tooltip")],ex);let eS={getTabsByNamespace:e=>e&&e===s.b.CHAIN.EVM?l.OptionsController.state.remoteFeatures?.activity===!1?el.b.ACCOUNT_TABS.filter(e=>"Activity"!==e.label):el.b.ACCOUNT_TABS:[],isValidReownName:e=>/^[a-zA-Z0-9]+$/gu.test(e),isValidEmail:e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/gu.test(e),validateReownName:e=>e.replace(/\^/gu,"").toLowerCase().replace(/[^a-zA-Z0-9]/gu,""),hasFooter(){let e=w.RouterController.state.view;if(el.b.VIEWS_WITH_LEGAL_FOOTER.includes(e)){let{termsConditionsUrl:e,privacyPolicyUrl:t}=l.OptionsController.state,o=l.OptionsController.state.features?.legalCheckbox;return(!!e||!!t)&&!o}return el.b.VIEWS_WITH_DEFAULT_FOOTER.includes(e)}};o(17791);var eA=(0,U.iv)`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({spacing:e})=>e["3"]};
  }

  a {
    text-decoration: none;
    color: ${({tokens:e})=>e.core.textAccentPrimary};
    font-weight: 500;
  }
`,eP=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let e$=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=l.OptionsController.state,o=l.OptionsController.state.features?.legalCheckbox;return(e||t)&&!o?(0,r.dy)`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4","3","3","3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `:(0,r.dy)`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(!0)} </wui-flex>
      `}andTemplate(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=l.OptionsController.state;return e&&t?"and":""}termsTemplate(){let{termsConditionsUrl:e}=l.OptionsController.state;return e?(0,r.dy)`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`:null}privacyTemplate(){let{privacyPolicyUrl:e}=l.OptionsController.state;return e?(0,r.dy)`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`:null}reownBrandingTemplate(e=!1){return this.remoteFeatures?.reownBranding?e?(0,r.dy)`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`:(0,r.dy)`<wui-ux-by-reown></wui-ux-by-reown>`:null}};e$.styles=[eA],eP([(0,a.SB)()],e$.prototype,"remoteFeatures",void 0),e$=eP([(0,U.Mo)("w3m-legal-footer")],e$),o(76470);var eR=(0,r.iv)``;let eE=class extends r.oi{render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=l.OptionsController.state;return e||t?(0,r.dy)`
      <wui-flex
        .padding=${["4","3","3","3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `:null}howDoesItWorkTemplate(){return(0,r.dy)` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`}onWhatIsBuy(){O.X.sendEvent({type:"track",event:"SELECT_WHAT_IS_A_BUY",properties:{isSmartAccount:(0,S.r9)(d.R.state.activeChain)===T.y_.ACCOUNT_TYPES.SMART_ACCOUNT}}),w.RouterController.push("WhatIsABuy")}};eE.styles=[eR],eE=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n}([(0,U.Mo)("w3m-onramp-providers-footer")],eE);var eN=(0,U.iv)`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`,eI=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eO=class extends r.oi{constructor(){super(...arguments),this.resizeObserver=void 0,this.unsubscribe=[],this.status="hide",this.view=w.RouterController.state.view}firstUpdated(){this.status=eS.hasFooter()?"show":"hide",this.unsubscribe.push(w.RouterController.subscribeKey("view",e=>{this.view=e,this.status=eS.hasFooter()?"show":"hide","hide"===this.status&&document.documentElement.style.setProperty("--apkt-footer-height","0px")})),this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=`${t.contentRect.height}px`;document.documentElement.style.setProperty("--apkt-footer-height",e)}}),this.resizeObserver.observe(this.getWrapper())}render(){return(0,r.dy)`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `}templatePageContainer(){return eS.hasFooter()?(0,r.dy)` ${this.templateFooter()}`:null}templateFooter(){switch(this.view){case"Networks":return this.templateNetworksFooter();case"Connect":case"ConnectWallets":case"OnRampFiatSelect":case"OnRampTokenSelect":return(0,r.dy)`<w3m-legal-footer></w3m-legal-footer>`;case"OnRampProviders":return(0,r.dy)`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;default:return null}}templateNetworksFooter(){return(0,r.dy)` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`}onNetworkHelp(){O.X.sendEvent({type:"track",event:"CLICK_NETWORK_HELP"}),w.RouterController.push("WhatIsANetwork")}getWrapper(){return this.shadowRoot?.querySelector("div.container")}};eO.styles=[eN],eI([(0,a.SB)()],eO.prototype,"status",void 0),eI([(0,a.SB)()],eO.prototype,"view",void 0),eO=eI([(0,U.Mo)("w3m-footer")],eO);var eW=(0,U.iv)`
  :host {
    display: block;
    width: inherit;
  }
`,eB=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eD=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.viewState=w.RouterController.state.view,this.history=w.RouterController.state.history.join(","),this.unsubscribe.push(w.RouterController.subscribeKey("view",()=>{this.history=w.RouterController.state.history.join(","),document.documentElement.style.setProperty("--apkt-duration-dynamic","var(--apkt-durations-lg)")}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),document.documentElement.style.setProperty("--apkt-duration-dynamic","0s")}render(){return(0,r.dy)`${this.templatePageContainer()}`}templatePageContainer(){return(0,r.dy)`<w3m-router-container
      history=${this.history}
      .setView=${()=>{this.viewState=w.RouterController.state.view}}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`}viewTemplate(e){switch(e){case"AccountSettings":return(0,r.dy)`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return(0,r.dy)`<w3m-account-view></w3m-account-view>`;case"AllWallets":return(0,r.dy)`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return(0,r.dy)`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return(0,r.dy)`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return(0,r.dy)`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":default:return(0,r.dy)`<w3m-connect-view></w3m-connect-view>`;case"Create":return(0,r.dy)`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return(0,r.dy)`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return(0,r.dy)`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return(0,r.dy)`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return(0,r.dy)`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return(0,r.dy)`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return(0,r.dy)`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return(0,r.dy)`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"DataCapture":return(0,r.dy)`<w3m-data-capture-view></w3m-data-capture-view>`;case"DataCaptureOtpConfirm":return(0,r.dy)`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;case"Downloads":return(0,r.dy)`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return(0,r.dy)`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return(0,r.dy)`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return(0,r.dy)`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return(0,r.dy)`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return(0,r.dy)`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return(0,r.dy)`<w3m-network-switch-view></w3m-network-switch-view>`;case"ProfileWallets":return(0,r.dy)`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;case"Transactions":return(0,r.dy)`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return(0,r.dy)`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampTokenSelect":return(0,r.dy)`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return(0,r.dy)`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return(0,r.dy)`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return(0,r.dy)`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return(0,r.dy)`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return(0,r.dy)`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return(0,r.dy)`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return(0,r.dy)`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return(0,r.dy)`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return(0,r.dy)`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return(0,r.dy)`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return(0,r.dy)`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return(0,r.dy)`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WhatIsABuy":return(0,r.dy)`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return(0,r.dy)`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return(0,r.dy)`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return(0,r.dy)`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return(0,r.dy)`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return(0,r.dy)`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return(0,r.dy)`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return(0,r.dy)`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return(0,r.dy)`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return(0,r.dy)`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return(0,r.dy)`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return(0,r.dy)`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return(0,r.dy)`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return(0,r.dy)`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return(0,r.dy)`<w3m-pay-loading-view></w3m-pay-loading-view>`;case"FundWallet":return(0,r.dy)`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;case"PayWithExchange":return(0,r.dy)`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;case"PayWithExchangeSelectAsset":return(0,r.dy)`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`}}};eD.styles=[eW],eB([(0,a.SB)()],eD.prototype,"viewState",void 0),eB([(0,a.SB)()],eD.prototype,"history",void 0),eD=eB([(0,U.Mo)("w3m-router")],eD);var ez=(0,U.iv)`
  :host {
    z-index: var(--w3m-z-index);
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: ${({tokens:e})=>e.theme.overlay};
    backdrop-filter: blur(0px);
    transition:
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      backdrop-filter ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
    backdrop-filter: blur(8px);
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--apkt-modal-width);
    width: 100%;
    position: relative;
    outline: none;
    transform: translateY(4px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
    transition:
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: border-radius, background-color, transform, box-shadow;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: ${({spacing:e})=>e[1]};
    box-sizing: border-box;
  }

  :host(.open) wui-card {
    transform: translateY(0px);
  }

  wui-card::before {
    z-index: 1;
    pointer-events: none;
    content: '';
    position: absolute;
    inset: 0;
    border-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    transition: box-shadow ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    transition-delay: ${({durations:e})=>e.md};
    will-change: box-shadow;
  }

  :host([data-border='true']) wui-card::before {
    box-shadow: inset 0px 0px 0px 4px ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  :host([data-border='false']) wui-card::before {
    box-shadow: inset 0px 0px 0px 1px ${({tokens:e})=>e.theme.borderPrimaryDark};
  }

  :host([data-border='true']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-border var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  :host([data-border='false']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-default var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: 0s;
  }

  :host(.appkit-modal) wui-card {
    max-width: 400px;
  }

  wui-card[shake='true'] {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      w3m-shake ${({durations:e})=>e.xl}
        ${({easings:e})=>e["ease-out-power-2"]};
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--apkt-spacing-6) 0px;
    }
  }

  @media (max-width: 430px) {
    wui-flex {
      align-items: flex-end;
    }

    wui-card {
      max-width: 100%;
      border-bottom-left-radius: var(--local-border-bottom-mobile-radius);
      border-bottom-right-radius: var(--local-border-bottom-mobile-radius);
      border-bottom: none;
    }

    wui-card[shake='true'] {
      animation: w3m-shake 0.5s ${({easings:e})=>e["ease-out-power-2"]};
    }
  }

  @keyframes fade-in {
    0% {
      transform: scale(0.99) translateY(4px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes card-background-border {
    from {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  @keyframes card-background-default {
    from {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
  }
`,eU=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eF="scroll-lock";class eM extends r.oi{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=l.OptionsController.state.enableEmbedded,this.open=c.I.state.open,this.caipAddress=d.R.state.activeCaipAddress,this.caipNetwork=d.R.state.activeCaipNetwork,this.shake=c.I.state.shake,this.filterByNamespace=u.ConnectorController.state.filterByNamespace,this.initializeTheming(),p.ApiController.prefetchAnalyticsConfig(),this.unsubscribe.push(c.I.subscribeKey("open",e=>e?this.onOpen():this.onClose()),c.I.subscribeKey("shake",e=>this.shake=e),d.R.subscribeKey("activeCaipNetwork",e=>this.onNewNetwork(e)),d.R.subscribeKey("activeCaipAddress",e=>this.onNewAddress(e)),l.OptionsController.subscribeKey("enableEmbedded",e=>this.enableEmbedded=e),u.ConnectorController.subscribeKey("filterByNamespace",e=>{this.filterByNamespace===e||d.R.getAccountData(e)?.caipAddress||(p.ApiController.fetchRecommendedWallets(),this.filterByNamespace=e)}),w.RouterController.subscribeKey("view",()=>{this.dataset.border=eS.hasFooter()?"true":"false"}))}firstUpdated(){if(this.dataset.border=eS.hasFooter()?"true":"false",this.caipAddress){if(this.enableEmbedded){c.I.close(),this.prefetch();return}this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return(this.style.cssText=`
      --local-border-bottom-mobile-radius: ${this.enableEmbedded?"clamp(0px, var(--apkt-borderRadius-8), 44px)":"0px"};
    `,this.enableEmbedded)?(0,r.dy)`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?(0,r.dy)`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return(0,r.dy)` <wui-card
      shake="${this.shake}"
      data-embedded="${(0,i.o)(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-footer></w3m-footer>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(e){e.target===e.currentTarget&&await this.handleClose()}async handleClose(){await g.safeClose()}initializeTheming(){let{themeVariables:e,themeMode:t}=y.ThemeController.state,o=U.Hg.getColorTheme(t);(0,U.n)(e,o)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),f.SnackController.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){let e=document.createElement("style");e.dataset.w3m=eF,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){let e=document.head.querySelector(`style[data-w3m="${eF}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;let e=this.shadowRoot?.querySelector("wui-card");e?.focus(),window.addEventListener("keydown",t=>{if("Escape"===t.key)this.handleClose();else if("Tab"===t.key){let{tagName:o}=t.target;!o||o.includes("W3M-")||o.includes("WUI-")||e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){let t=d.R.state.isSwitchingNamespace,o="ProfileWallets"===w.RouterController.state.view;e?await this.onConnected({caipAddress:e,isSwitchingNamespace:t,isInProfileView:o}):t||this.enableEmbedded||o||c.I.close(),await h.w.initializeIfEnabled(e),this.caipAddress=e,d.R.setIsSwitchingNamespace(!1)}async onConnected(e){if(e.isInProfileView)return;let{chainNamespace:t,chainId:o,address:r}=n.u.parseCaipAddress(e.caipAddress),a=`${t}:${o}`,i=!b.j.getPlainAddress(this.caipAddress),s=await h.w.getSessions({address:r,caipNetworkId:a}),l=!h.w.getSIWX()||s.some(e=>e.data.accountAddress===r),d=e.isSwitchingNamespace&&l&&!this.enableEmbedded,u=this.enableEmbedded&&i;d?w.RouterController.goBack():u&&c.I.close()}onNewNetwork(e){let t=this.caipNetwork,o=t?.caipNetworkId?.toString(),r=t?.chainNamespace,a=e?.caipNetworkId?.toString(),i=e?.chainNamespace,n=o!==a,l=t?.name===s.b.UNSUPPORTED_NETWORK_NAME,u="ConnectingExternal"===w.RouterController.state.view,p="ProfileWallets"===w.RouterController.state.view,m=!d.R.getAccountData(e?.chainNamespace)?.caipAddress,h="UnsupportedChain"===w.RouterController.state.view,g=c.I.state.open,y=!1;this.enableEmbedded&&"SwitchNetwork"===w.RouterController.state.view&&(y=!0),n&&z.resetState(),!g||u||p||(m?n&&(y=!0):h?y=!0:!n||r!==i||l||(y=!0)),y&&"SIWXSignMessage"!==w.RouterController.state.view&&w.RouterController.goBack(),this.caipNetwork=e}prefetch(){this.hasPrefetched||(p.ApiController.prefetch(),p.ApiController.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}eM.styles=ez,eU([(0,a.Cb)({type:Boolean})],eM.prototype,"enableEmbedded",void 0),eU([(0,a.SB)()],eM.prototype,"open",void 0),eU([(0,a.SB)()],eM.prototype,"caipAddress",void 0),eU([(0,a.SB)()],eM.prototype,"caipNetwork",void 0),eU([(0,a.SB)()],eM.prototype,"shake",void 0),eU([(0,a.SB)()],eM.prototype,"filterByNamespace",void 0);let ej=class extends eM{};ej=eU([(0,U.Mo)("w3m-modal")],ej);let eL=class extends eM{};eL=eU([(0,U.Mo)("appkit-modal")],eL);var e_=(0,U.iv)`
  :host {
    --local-duration-height: 0s;
    --local-duration: ${({durations:e})=>e.lg};
    --local-transition: ${({easings:e})=>e["ease-out-power-2"]};
  }

  .container {
    display: block;
    overflow: hidden;
    overflow: hidden;
    position: relative;
    height: var(--local-container-height);
    transition: height var(--local-duration-height) var(--local-transition);
    will-change: height, padding-bottom;
  }

  .page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    width: inherit;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-bottom-left-radius: var(--local-border-bottom-radius);
    border-bottom-right-radius: var(--local-border-bottom-radius);
    transition: border-bottom-left-radius var(--local-duration) var(--local-transition);
  }

  .footer {
    height: var(--apkt-footer-height);
  }

  div.page[view-direction^='prev-'] .page-content {
    animation:
      slide-left-out var(--local-duration) forwards var(--local-transition),
      slide-left-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  div.page[view-direction^='next-'] .page-content {
    animation:
      slide-right-out var(--local-duration) forwards var(--local-transition),
      slide-right-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }
`,eH=function(e,t,o,r){var a,i=arguments.length,n=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(n=(i<3?a(n):i>3?a(t,o,n):a(t,o))||n);return i>3&&n&&Object.defineProperty(t,o,n),n};let eV=class extends r.oi{constructor(){super(...arguments),this.resizeObserver=void 0,this.transitionDuration="0.15s",this.transitionFunction="",this.history="",this.view="",this.setView=void 0,this.viewDirection="",this.historyState="",this.previousHeight="0px"}updated(e){if(e.has("history")){let e=this.history;""!==this.historyState&&this.historyState!==e&&this.onViewChange(e)}e.has("transitionDuration")&&this.style.setProperty("--local-duration",this.transitionDuration),e.has("transitionFunction")&&this.style.setProperty("--local-transition",this.transitionFunction)}firstUpdated(){this.transitionFunction&&this.style.setProperty("--local-transition",this.transitionFunction),this.style.setProperty("--local-duration",this.transitionDuration),this.historyState=this.history,this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=t.contentRect.height,o=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0");e+=o,this.style.setProperty("--local-border-bottom-radius",o?"var(--apkt-borderRadius-5)":"0px"),this.style.setProperty("--local-container-height",`${e}px`),"0px"!==this.previousHeight&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${e}px`}}),this.resizeObserver.observe(this.getWrapper())}disconnectedCallback(){let e=this.getWrapper();e&&this.resizeObserver&&this.resizeObserver.unobserve(e)}render(){return(0,r.dy)`
      <div class="container">
        <div class="page" view-direction="${this.viewDirection}">
          <div class="page-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `}onViewChange(e){let t=e.split(",").filter(Boolean),o=this.historyState.split(",").filter(Boolean),r=o.length,a=t.length,i=t[t.length-1]||"",n=U.Hg.cssDurationToNumber(this.transitionDuration),s="";a>r?s="next":a<r?s="prev":a===r&&t[a-1]!==o[r-1]&&(s="next"),this.viewDirection=`${s}-${i}`,setTimeout(()=>{this.historyState=e,this.setView?.(i)},n),setTimeout(()=>{this.viewDirection=""},2*n)}getWrapper(){return this.shadowRoot?.querySelector("div.page")}};eV.styles=[e_],eH([(0,a.Cb)({type:String})],eV.prototype,"transitionDuration",void 0),eH([(0,a.Cb)({type:String})],eV.prototype,"transitionFunction",void 0),eH([(0,a.Cb)({type:String})],eV.prototype,"history",void 0),eH([(0,a.Cb)({type:String})],eV.prototype,"view",void 0),eH([(0,a.Cb)({attribute:!1})],eV.prototype,"setView",void 0),eH([(0,a.SB)()],eV.prototype,"viewDirection",void 0),eH([(0,a.SB)()],eV.prototype,"historyState",void 0),eH([(0,a.SB)()],eV.prototype,"previousHeight",void 0),eV=eH([(0,U.Mo)("w3m-router-container")],eV)}}]);