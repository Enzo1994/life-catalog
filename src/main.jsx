import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Camera,
  Compass,
  UserRound,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Share2,
  MoreHorizontal,
  Clock3,
  X,
  Check,
  Grid2X2,
  List,
  ImagePlus,
  ArrowRight,
  Heart,
  SlidersHorizontal,
  Sparkles,
  Cloud,
  Download,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  Leaf,
  Layers,
  CalendarDays,
  Bookmark,
  NotebookPen,
  LoaderCircle,
  Wifi,
  BatteryFull,
  Signal,
} from "lucide-react";
import {
  seedData,
  localDate,
  collectionItems,
  canAdd,
  validateCollection,
  findMemories,
  searchItems,
  addItem,
} from "./model.mjs";
import { createShareBlob, download } from "./export.js";
import "./style.css";
import {
  isNative,
  nativePlatform,
  pickNativePhoto,
  cutoutPhoto,
} from "./native.js";
import { loadCatalog, persistCatalog } from "./storage.js";
import { App as NativeApp } from "@capacitor/app";
const styles = [
  ["paper", "纸间收藏", "轻柔纸张 · 留住本来的样子"],
  ["gallery", "纯白展柜", "干净留白 · 让物品自己说话"],
  ["card", "彩色卡片", "淡彩底色 · 日常的一点轻快"],
];
const prettyDate = (d) => d?.replaceAll("-", ".");
function ObjectImage({ item, className = "", version = "auto", ...props }) {
  const source =
    version === "original" ? item?.photo : item?.cutout || item?.photo;
  return source ? (
    <img
      className={`object-photo ${className}`}
      src={source}
      alt={item.name || "收录的照片"}
      {...props}
    />
  ) : (
    <span
      role="img"
      aria-label={item?.name || "示例物品"}
      className={`object-sprite ${className}`}
      style={{
        backgroundPosition: `${((item?.asset || 0) % 3) * 50}% ${Math.floor((item?.asset || 0) / 3) * 100}%`,
      }}
      {...props}
    />
  );
}
function IconButton({ label, children, onClick, className = "" }) {
  return (
    <button
      className={`icon-button ${className}`}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function App({ initialData }) {
  const [data, setData] = useState(initialData);
  const [route, setRoute] = useState({ page: "home" }),
    [history, setHistory] = useState([]),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState("全部"),
    [view, setView] = useState("grid"),
    [draft, setDraft] = useState(null),
    [step, setStep] = useState(0),
    [variant, setVariant] = useState("original"),
    [shareOptions, setShareOptions] = useState({ story: true, date: true }),
    [busy, setBusy] = useState(false);
  const scroller = useRef(),
    submitInFlight = useRef(false),
    fileRef = useRef(),
    modalRef = useRef(),
    triggerRef = useRef();
  const notify = (msg) => setToast(msg);
  const save = async (next) => {
    try {
      await persistCatalog(next);
      setData(next);
      return true;
    } catch {
      notify("本机存储空间不足，请先导出备份后再试");
      return false;
    }
  };
  const go = (page, extra = {}) => {
    setHistory((h) => [...h, route]);
    setRoute({ page, ...extra });
    setVariant("original");
    setModal(null);
  };
  const back = () => {
    setRoute(history.at(-1) || { page: "home" });
    setHistory((h) => h.slice(0, -1));
    setModal(null);
  };
  const home = () => {
    setRoute({ page: "home" });
    setHistory([]);
    setModal(null);
  };
  useEffect(() => {
    if (nativePlatform !== "android") return;
    const listener = NativeApp.addListener("backButton", () => {
      if (busy) return;
      if (modal) setModal(null);
      else if (route.page === "capture") {
        if (step > 0) setStep(step - 1);
        else setModal({ type: "exit-capture" });
      } else if (history.length) back();
      else if (route.page !== "home") home();
      else NativeApp.exitApp();
    });
    return () => {
      listener.then((handle) => handle.remove());
    };
  }, [route, history, modal, step, busy]);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [route.page, route.id, step]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3200);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (modal) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() =>
        modalRef.current
          ?.querySelector("input,button,textarea,select")
          ?.focus(),
      );
    } else triggerRef.current?.focus?.();
  }, [modal?.type]);
  useEffect(() => {
    const fn = (e) => {
      if (!modal) return;
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = modalRef.current?.querySelectorAll(
          'button:not(:disabled),input,textarea,select,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modal]);
  const currentCollection = data.collections.find((c) => c.id === route.id),
    currentItem = data.items.find((i) => i.id === route.id),
    memories = findMemories(data.items);
  const startCapture = () => {
    setDraft({
      asset: 0,
      photo: null,
      name: "",
      story: "",
      collectionId: currentCollection?.id || "casual",
      source: "",
      tags: [],
      date: localDate(),
      rating: 0,
    });
    setStep(0);
    go("capture");
  };
  const openCollection = (id) => {
    setView("grid");
    go("collection", { id });
  };
  const openItem = (id) => go("item", { id });
  const openCreate = () =>
    setModal({
      type: "collection",
      name: "",
      mode: "free",
      total: 12,
      color: "mint",
    });
  const openShare = (item, collection) => {
    setShareOptions({ story: true, date: true });
    setModal({ type: "share", item, collection });
  };
  const readPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("请选择一张图片");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify("当前原型支持 3 MB 以内的照片，原始文件不会被压缩");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const img = new window.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photo;
      });
      setDraft((d) => ({
        ...d,
        photo,
        cutout: null,
        cutoutError: null,
        showOriginal: false,
      }));
      setStep(1);
    } catch {
      notify("这张照片暂时无法读取，请换一张 JPG 或 PNG");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const choosePhoto = async (source) => {
    if (!isNative) {
      if (source === "camera")
        fileRef.current.setAttribute("capture", "environment");
      else fileRef.current.removeAttribute("capture");
      fileRef.current.click();
      return;
    }
    try {
      const photo = await pickNativePhoto(source);
      setDraft((d) => ({
        ...d,
        photo,
        cutout: null,
        cutoutError: null,
        showOriginal: false,
      }));
      setStep(1);
    } catch (error) {
      if (!/cancel/i.test(error.message || ""))
        notify(error.message || "无法打开相机或相册，请检查系统权限");
    }
  };
  const runCutout = async () => {
    if (!draft.photo) {
      notify("示例素材已是透明图，请导入真实照片体验抠图");
      return;
    }
    setBusy(true);
    try {
      const result = await cutoutPhoto(draft.photo);
      setDraft((d) => ({
        ...d,
        cutout: result.dataUrl,
        cutoutEngine: result.engine,
        cutoutError: null,
        showOriginal: false,
      }));
      notify("已完成离线抠图，请检查边缘后确认");
    } catch (error) {
      setDraft((d) => ({
        ...d,
        cutoutError: error.message || "抠图失败，请换张照片再试",
      }));
    } finally {
      setBusy(false);
    }
  };
  const makeExistingCutout = async () => {
    if (!currentItem?.photo) {
      notify("示例素材已是透明图，请导入真实照片体验抠图");
      return;
    }
    setBusy(true);
    try {
      const result = await cutoutPhoto(currentItem.photo);
      const updated = {
        ...currentItem,
        cutout: result.dataUrl,
        cutoutEngine: result.engine,
      };
      if (
        await save({
          ...data,
          items: data.items.map((i) => (i.id === updated.id ? updated : i)),
        })
      )
        setVariant("cutout");
    } catch (error) {
      notify(error.message || "抠图失败，原始照片已保留");
    } finally {
      setBusy(false);
    }
  };
  const submitItem = async () => {
    if (!draft || submitInFlight.current) return;
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { showOriginal, cutoutError, ...record } = draft;
      const item = {
        ...record,
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        story: draft.story.trim(),
      };
      if (await save(addItem(data, item))) {
        setDraft(null);
        setStep(0);
        setHistory([]);
        setRoute({ page: "item", id: item.id });
        setVariant(item.cutout ? "cutout" : "original");
        notify("已经收进图鉴，故事可以慢慢写。");
      }
    } catch (e) {
      notify(e.message);
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  };
  async function exportBackup() {
    try {
      await download(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        "人生图鉴-备份.json",
      );
      notify(
        isNative
          ? "已打开系统分享，请选择保存位置"
          : "备份已导出，包含原图、抠图和故事",
      );
    } catch {
      notify("未完成备份导出，请再试一次");
    }
  }
  async function exportShare() {
    setBusy(true);
    try {
      const blob = await createShareBlob({
        ...modal,
        items: collectionItems(data, modal.collection.id),
        ...shareOptions,
      });
      if (!blob) throw Error();
      await download(
        blob,
        `${modal.item?.name || modal.collection.name || "人生图鉴"}.png`,
      );
      notify("分享图片已导出");
      setModal(null);
    } catch {
      notify("图片导出失败，请再试一次");
    } finally {
      setBusy(false);
    }
  }
  const nav = (
    <nav className="tabbar" aria-label="主导航">
      <button className={route.page === "home" ? "active" : ""} onClick={home}>
        <BookOpen />
        <span>图鉴架</span>
      </button>
      <button onClick={startCapture}>
        <span className="camera-tab">
          <Camera />
        </span>
        <span>拍摄</span>
      </button>
      <button
        className={route.page === "discover" ? "active" : ""}
        onClick={async () => go("discover")}
      >
        <Compass />
        <span>发现</span>
      </button>
      <button
        className={route.page === "profile" ? "active" : ""}
        onClick={async () => go("profile")}
      >
        <UserRound />
        <span>我的</span>
      </button>
    </nav>
  );
  const topbar = (title, action) => (
    <header className="topbar">
      <IconButton label="返回" onClick={back}>
        <ChevronLeft />
      </IconButton>
      <span>{title}</span>
      {action || <span className="topbar-spacer" />}
    </header>
  );
  const itemGrid = (items, emptySlots = 0) => (
    <div className="item-grid">
      {items.map((i) => (
        <button
          className="item-card"
          key={i.id}
          onClick={async () => openItem(i.id)}
        >
          <div
            className={`item-art container-${currentCollection?.container || "paper"}`}
          >
            <ObjectImage item={i} />
          </div>
          <span className="item-name">{i.name || "未命名物品"}</span>
          <time>{prettyDate(i.date)}</time>
        </button>
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <button
          key={`empty-${i}`}
          className="empty-slot"
          onClick={startCapture}
        >
          <Plus size={22} />
          <span>留给下一件</span>
        </button>
      ))}
    </div>
  );
  const timeline = (items) => (
    <div className="timeline">
      {[...items]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((i) => (
          <button
            key={i.id}
            className="timeline-item"
            onClick={async () => openItem(i.id)}
          >
            <div className="time-dot" />
            <time>{prettyDate(i.date)}</time>
            <div className="timeline-card">
              <ObjectImage item={i} />
              <div>
                <h3>{i.name || "未命名物品"}</h3>
                <p>{i.story || "故事，等以后慢慢写。"}</p>
              </div>
              <ChevronRight size={16} />
            </div>
          </button>
        ))}
    </div>
  );
  const progress = currentCollection?.mode === "complete";
  return (
    <div className="studio">
      <aside className="studio-intro">
        <div className="wordmark">
          <BookOpen size={20} />
          <span>人生图鉴</span>
          <small>交互原型</small>
        </div>
        <div className="intro-copy">
          <span className="eyebrow">A LITTLE MUSEUM OF YOUR LIFE</span>
          <h1>
            把舍不得的日常，
            <br />
            好好收起来。
          </h1>
          <p>
            一只杯子，一张旧车票。
            <br />
            那些看似普通的东西，
            <br />
            藏着只属于你的故事。
          </p>
          <div className="intro-rule" />
          <span className="edition">纸间收藏 / 白底版 · 01</span>
        </div>
        <div className="preview-links">
          <span>慢慢逛逛</span>
          <button onClick={home}>
            打开图鉴架 <ArrowRight size={16} />
          </button>
          <button onClick={async () => go("timeline")}>
            沿着时间看看 <ArrowRight size={16} />
          </button>
          <button onClick={startCapture}>
            收录一件物品 <ArrowRight size={16} />
          </button>
        </div>
        <p className="studio-note">示例内容仅用于体验 · 数据保存在当前浏览器</p>
      </aside>
      <div className="phone-wrap">
        <div className="phone">
          <div className="statusbar">
            <span>9:41</span>
            <div>
              <Signal size={14} />
              <Wifi size={15} />
              <BatteryFull size={20} />
            </div>
          </div>
          <main className={`screen screen-${route.page}`} ref={scroller}>
            {route.page === "home" && (
              <>
                <header className="home-header">
                  <div className="hello">
                    我的生活，值得被收藏 <span>✳</span>
                  </div>
                  <div className="title-row">
                    <h1>人生图鉴</h1>
                    <IconButton
                      label="搜索物品"
                      onClick={async () => go("search")}
                    >
                      <Search />
                    </IconButton>
                  </div>
                  <p>把舍不得的日常，好好收起来。</p>
                </header>
                {memories.length > 0 && (
                  <button
                    className="memory-card"
                    onClick={async () => go("memories")}
                  >
                    <div className="memory-copy">
                      <span>
                        <Clock3 size={13} /> 一年前的今天
                      </span>
                      <p>还记得，带它回家的那天吗？</p>
                      <time>{prettyDate(memories[0].date)}</time>
                    </div>
                    <ObjectImage item={memories[0]} />
                    <ChevronRight size={17} />
                  </button>
                )}
                <div className="shelf-heading">
                  <span>
                    我的图鉴 <small>{data.collections.length} 本</small>
                  </span>
                  <button onClick={async () => go("timeline")}>
                    <Clock3 size={14} /> 时间线
                  </button>
                </div>
                <div className="bookcase">
                  {Array.from(
                    { length: Math.ceil(data.collections.length / 2) },
                    (_, row) => (
                      <div className="shelf-row" key={row}>
                        <div className="books">
                          {data.collections
                            .slice(row * 2, row * 2 + 2)
                            .map((c, index) => {
                              const items = collectionItems(data, c.id);
                              return (
                                <button
                                  className={`book book-${c.color}`}
                                  key={c.id}
                                  onClick={async () => openCollection(c.id)}
                                >
                                  <div className="book-binding" />
                                  <div className="book-top">
                                    <span className="book-index">
                                      VOL.{" "}
                                      {String(row * 2 + index + 1).padStart(
                                        2,
                                        "0",
                                      )}
                                    </span>
                                    <h2>{c.name}</h2>
                                    <p>
                                      {c.mode === "complete"
                                        ? `已收录 ${items.length} / ${c.total} 件`
                                        : `已收录 ${items.length} 件`}
                                    </p>
                                  </div>
                                  <div
                                    className={`book-collage collage-${row * 2 + index}`}
                                  >
                                    <div className="paper-slip" />
                                    {items.length ? (
                                      <>
                                        <ObjectImage
                                          item={
                                            items[1] || {
                                              asset: 5,
                                              name: "明信片",
                                            }
                                          }
                                          className="collage-back"
                                        />
                                        <ObjectImage
                                          item={items[0]}
                                          className="collage-front"
                                        />
                                        <span className="tape" />
                                      </>
                                    ) : (
                                      <div className="empty-book">
                                        <Bookmark size={27} strokeWidth={1} />
                                        <span>等一个故事</span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        <div className="wood-shelf" />
                      </div>
                    ),
                  )}
                </div>
                <button className="new-collection" onClick={openCreate}>
                  <Plus size={17} /> 新建系列
                </button>
                <div className="quiet-footer">
                  <Leaf size={13} /> 每一件，都有它的故事。
                </div>
              </>
            )}
            {route.page === "collection" && currentCollection && (
              <>
                {topbar(
                  "我的图鉴",
                  <div className="top-actions">
                    <IconButton
                      label="分享系列"
                      onClick={async () => openShare(null, currentCollection)}
                    >
                      <Share2 size={20} />
                    </IconButton>
                    <IconButton
                      label="系列设置"
                      onClick={async () =>
                        setModal({ type: "style", id: currentCollection.id })
                      }
                    >
                      <MoreHorizontal />
                    </IconButton>
                  </div>,
                )}
                <section className="collection-header">
                  <span className={`mini-book book-${currentCollection.color}`}>
                    <BookOpen size={20} />
                  </span>
                  <div>
                    <span className="eyebrow">MY LITTLE COLLECTION</span>
                    <h1>{currentCollection.name}</h1>
                    <p>
                      {progress
                        ? `已收录 ${collectionItems(data, currentCollection.id).length} / ${currentCollection.total} 件`
                        : `已收录 ${collectionItems(data, currentCollection.id).length} 件`}
                    </p>
                  </div>
                </section>
                <p className="collection-description">
                  {currentCollection.description ||
                    "让喜欢的东西，有个自己的位置。"}
                </p>
                {progress && (
                  <div className="completion">
                    <div>
                      <span>
                        {collectionItems(data, currentCollection.id).length ===
                        currentCollection.total
                          ? "已经集齐，好好珍藏。"
                          : "慢慢收集，每一件都算数。"}
                      </span>
                      <b>
                        {Math.round(
                          (collectionItems(data, currentCollection.id).length /
                            currentCollection.total) *
                            100,
                        )}
                        %
                      </b>
                    </div>
                    <progress
                      value={collectionItems(data, currentCollection.id).length}
                      max={currentCollection.total}
                    />
                  </div>
                )}
                <div className="collection-tools">
                  <div className="segmented">
                    <button
                      className={view === "grid" ? "selected" : ""}
                      onClick={async () => setView("grid")}
                    >
                      <Grid2X2 size={14} />
                      网格
                    </button>
                    <button
                      className={view === "timeline" ? "selected" : ""}
                      onClick={async () => setView("timeline")}
                    >
                      <List size={15} />
                      时间线
                    </button>
                  </div>
                  <button
                    className="style-link"
                    onClick={async () =>
                      setModal({ type: "style", id: currentCollection.id })
                    }
                  >
                    <SlidersHorizontal size={15} />
                    风格
                  </button>
                </div>
                {collectionItems(data, currentCollection.id).length ||
                progress ? (
                  view === "grid" ? (
                    itemGrid(
                      collectionItems(data, currentCollection.id),
                      progress
                        ? currentCollection.total -
                            collectionItems(data, currentCollection.id).length
                        : 0,
                    )
                  ) : (
                    timeline(collectionItems(data, currentCollection.id))
                  )
                ) : (
                  <div className="empty-state">
                    <BookOpen size={48} strokeWidth={1} />
                    <h2>这本图鉴，才刚刚开始。</h2>
                    <p>
                      拍下第一件物品，
                      <br />
                      给它留一个位置。
                    </p>
                    <button className="primary" onClick={startCapture}>
                      <Camera size={17} />
                      拍照收录
                    </button>
                  </div>
                )}
                {canAdd(data, currentCollection.id) &&
                  collectionItems(data, currentCollection.id).length > 0 && (
                    <button className="bottom-primary" onClick={startCapture}>
                      <Plus size={17} />
                      再收录一件
                    </button>
                  )}
              </>
            )}
            {route.page === "item" && currentItem && (
              <>
                {topbar(
                  "物品故事",
                  <IconButton
                    label="分享物品"
                    onClick={async () =>
                      openShare(
                        currentItem,
                        data.collections.find(
                          (c) => c.id === currentItem.collectionId,
                        ),
                      )
                    }
                  >
                    <Share2 size={20} />
                  </IconButton>,
                )}
                <div
                  className={`detail-art container-${data.collections.find((c) => c.id === currentItem.collectionId)?.container || "paper"}`}
                >
                  <span className="detail-number">
                    OBJECT /{" "}
                    {String(data.items.indexOf(currentItem) + 1).padStart(
                      3,
                      "0",
                    )}
                  </span>
                  <ObjectImage
                    item={currentItem}
                    version={variant === "original" ? "original" : "auto"}
                  />
                  <span className="detail-art-note">
                    {variant === "cutout" && currentItem.cutout
                      ? `${currentItem.cutoutEngine} · 透明图`
                      : currentItem.photo
                        ? "原始照片"
                        : "示例物品"}
                  </span>
                </div>
                <div className="detail-body">
                  <div className="segmented image-variants">
                    {[
                      ["original", "原图"],
                      ["cutout", "抠图"],
                      ["styled", "风格图"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        className={variant === id ? "selected" : ""}
                        onClick={async () => {
                          if (id === "original") setVariant(id);
                          else if (id === "cutout" && currentItem.cutout)
                            setVariant("cutout");
                          else if (id === "cutout" && isNative)
                            await makeExistingCutout();
                          else
                            setModal({
                              type:
                                id === "styled" ? "generation" : "cutout-info",
                            });
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <h1>{currentItem.name || "未命名物品"}</h1>
                  <button
                    className="series-chip"
                    onClick={async () =>
                      openCollection(currentItem.collectionId)
                    }
                  >
                    <BookOpen size={13} />
                    {
                      data.collections.find(
                        (c) => c.id === currentItem.collectionId,
                      )?.name
                    }
                    <ChevronRight size={13} />
                  </button>
                  <p className="date-line">
                    <CalendarDays size={14} />
                    {prettyDate(currentItem.date)} <span>收录</span>
                  </p>
                  <section className="story">
                    <div className="story-heading">
                      <h2>它的故事</h2>
                      <span>一点点日常，一点点念想</span>
                    </div>
                    <p>
                      {currentItem.story ||
                        "故事还没写。等某一天想起来，再慢慢记下。"}
                    </p>
                  </section>
                  <div className="tags">
                    {currentItem.tags.map((t) => (
                      <button
                        key={t}
                        onClick={async () => {
                          setTag(t);
                          setQuery("");
                          go("search");
                        }}
                      >
                        {t}
                      </button>
                    ))}
                    {currentItem.source && <span>{currentItem.source}</span>}
                  </div>
                  <button
                    className="edit-record"
                    onClick={async () =>
                      setModal({ type: "edit", ...currentItem })
                    }
                  >
                    <NotebookPen size={17} />
                    编辑记录
                    <ChevronRight size={16} />
                  </button>
                  <div className="quiet-footer">
                    <ShieldCheck size={12} /> 只属于你的记忆，默认私有
                  </div>
                </div>
              </>
            )}
            {route.page === "search" && (
              <>
                {topbar("找一件小东西")}
                <div className="page-pad">
                  <label className="search-box">
                    <Search size={19} />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="搜索名称、故事、标签…"
                    />
                    {query && (
                      <IconButton
                        label="清空搜索"
                        onClick={async () => setQuery("")}
                      >
                        <X size={16} />
                      </IconButton>
                    )}
                  </label>
                  <div className="filter-tags">
                    {[
                      "全部",
                      ...new Set(data.items.flatMap((i) => i.tags)),
                    ].map((t) => (
                      <button
                        key={t}
                        className={tag === t ? "selected" : ""}
                        onClick={async () => setTag(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="results-count">
                    找到 {searchItems(data, query, tag).length} 件物品
                  </p>
                  {itemGrid(searchItems(data, query, tag))}
                  {!searchItems(data, query, tag).length && (
                    <div className="empty-state">
                      <Search size={42} strokeWidth={1} />
                      <h2>暂时没找到</h2>
                      <p>换个关键词，或看看全部收藏。</p>
                      <button
                        className="secondary"
                        onClick={async () => {
                          setQuery("");
                          setTag("全部");
                        }}
                      >
                        清空筛选
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {route.page === "timeline" && (
              <>
                {topbar("生活的时间线")}
                <div className="page-pad">
                  <span className="eyebrow">LITTLE THINGS, OVER TIME</span>
                  <h1 className="page-title">日子留下的痕迹</h1>
                  <p className="page-subtitle">
                    {data.items.length} 件物品，串起那些值得记得的日子。
                  </p>
                  {data.items.length ? (
                    timeline(data.items)
                  ) : (
                    <div className="empty-state">
                      <Clock3 size={44} />
                      <h2>故事从今天开始</h2>
                      <button className="primary" onClick={startCapture}>
                        拍下第一件
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {route.page === "memories" && (
              <>
                {topbar("一年前的今天")}
                <div className="page-pad">
                  <span className="eyebrow">HELLO, OLD FRIEND</span>
                  <h1 className="page-title">原来，已经一年了。</h1>
                  <p className="page-subtitle">
                    物品替我们，把那一天记得好好的。
                  </p>
                  {memories.map((i) => (
                    <button
                      key={i.id}
                      className="recall-detail"
                      onClick={async () => openItem(i.id)}
                    >
                      <ObjectImage item={i} />
                      <time>{prettyDate(i.date)}</time>
                      <h2>{i.name || "未命名物品"}</h2>
                      <p>{i.story}</p>
                      <span>
                        再看看它的故事 <ArrowRight size={16} />
                      </span>
                    </button>
                  ))}
                  {!memories.length && (
                    <div className="empty-state">
                      <Leaf size={42} />
                      <h2>记忆正在慢慢生长</h2>
                      <p>未来的今天，会收到现在的回声。</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {route.page === "discover" && (
              <>
                {topbar("发现")}
                <div className="discover-empty">
                  <div className="pressed-leaf">
                    <Leaf size={64} strokeWidth={0.9} />
                  </div>
                  <span className="eyebrow">GOOD STORIES TAKE TIME</span>
                  <h1>
                    有些相遇，
                    <br />
                    值得再等一等。
                  </h1>
                  <p>
                    未来，在这里翻开别人的图鉴，
                    <br />
                    发现生活的另一种模样。
                  </p>
                  <span className="coming-soon">第二期 · 敬请期待</span>
                  <button className="secondary" onClick={home}>
                    先逛逛自己的图鉴 <ArrowRight size={15} />
                  </button>
                </div>
              </>
            )}
            {route.page === "profile" && (
              <>
                {topbar("我的")}
                <div className="page-pad">
                  <div className="profile-hero">
                    <div className="profile-avatar">
                      <Leaf size={30} strokeWidth={1} />
                    </div>
                    <h1>生活的收藏家</h1>
                    <p>认真生活的人，总能发现一点美好。</p>
                  </div>
                  <div className="stats">
                    <div>
                      <b>{data.collections.length}</b>
                      <span>本图鉴</span>
                    </div>
                    <div>
                      <b>{data.items.length}</b>
                      <span>件小东西</span>
                    </div>
                    <div>
                      <b>{data.items.filter((i) => i.story).length}</b>
                      <span>段故事</span>
                    </div>
                  </div>
                  <div className="settings-list">
                    {[
                      [
                        Sparkles,
                        "默认风格",
                        "纸间收藏",
                        () => setModal({ type: "default-style" }),
                      ],
                      [
                        Cloud,
                        "同步与存储",
                        "保存在此设备",
                        () => setModal({ type: "storage" }),
                      ],
                      [Download, "导出备份", "JSON", exportBackup],
                      [
                        ShieldCheck,
                        "隐私",
                        "默认私有",
                        () => setModal({ type: "privacy" }),
                      ],
                      [
                        Layers,
                        "生成额度",
                        "尚未接入",
                        () => setModal({ type: "generation" }),
                      ],
                    ].map(([Icon, label, value, fn]) => (
                      <button key={label} onClick={fn}>
                        <Icon size={18} />
                        <span>{label}</span>
                        <small>{value}</small>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                  <div className="demo-controls">
                    <p>原型体验</p>
                    <button
                      onClick={async () => setModal({ type: "empty-confirm" })}
                    >
                      体验全新图鉴的空态 <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={async () => setModal({ type: "reset-confirm" })}
                    >
                      恢复示例内容 <RotateCcw size={14} />
                    </button>
                  </div>
                  <div className="quiet-footer">人生图鉴 · V1.1 设计原型</div>
                </div>
              </>
            )}
            {route.page === "capture" && draft && (
              <>
                <header className="topbar">
                  <IconButton
                    label={step ? "上一步" : "关闭收录"}
                    onClick={async () =>
                      step
                        ? setStep(step - 1)
                        : setModal({ type: "exit-capture" })
                    }
                  >
                    {step ? <ChevronLeft /> : <X />}
                  </IconButton>
                  <span>
                    {
                      [
                        "留住一件小东西",
                        "确认这件物品",
                        "放进哪本图鉴",
                        "留下一点故事",
                      ][step]
                    }
                  </span>
                  <small>{step + 1} / 4</small>
                </header>
                <div className="capture-progress">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={i <= step ? "done" : ""} />
                  ))}
                </div>
                <div className="capture-content">
                  {step === 0 && (
                    <>
                      <span className="eyebrow">A NEW LITTLE MEMORY</span>
                      <h1>今天，想留下什么？</h1>
                      <p>一件物品，就能开启一段故事。</p>
                      <div className="capture-viewfinder">
                        <span className="viewfinder-corner tl" />
                        <span className="viewfinder-corner tr" />
                        <ObjectImage item={draft} />
                        <span className="viewfinder-corner bl" />
                        <span className="viewfinder-corner br" />
                        <span className="viewfinder-hint">
                          把物品放在干净的背景前
                        </span>
                      </div>
                      <button
                        className="primary full"
                        onClick={() => choosePhoto("photos")}
                      >
                        <ImagePlus size={18} />
                        从相册导入
                      </button>
                      <button
                        className="secondary full"
                        onClick={() => choosePhoto("camera")}
                      >
                        <Camera size={18} />
                        拍一张照片
                      </button>
                      <button
                        className="text-button"
                        onClick={async () => setStep(1)}
                      >
                        先用示例小杯子试试 <ArrowRight size={14} />
                      </button>
                      <p className="privacy-hint">
                        <ShieldCheck size={12} />{" "}
                        {isNative
                          ? "照片保存在此设备 · 离线抠图"
                          : "原文件保存在本机 · 单张限 3 MB"}
                      </p>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <h1>是你想留下的那一件吗？</h1>
                      <p>
                        {isNative
                          ? "在设备上分离主体，照片不会上传。"
                          : "浏览器可保存照片；离线抠图请安装 iOS 或 Android 版。"}
                      </p>
                      <div className="cutout-preview">
                        <ObjectImage
                          item={draft}
                          version={draft.showOriginal ? "original" : "auto"}
                        />
                        <span>
                          {draft.cutout && !draft.showOriginal
                            ? `${draft.cutoutEngine} · 透明图`
                            : draft.photo
                              ? "原始照片"
                              : "示例素材 · 主体预览"}
                        </span>
                      </div>
                      {isNative && draft.photo && (
                        <>
                          <button
                            className="secondary full"
                            disabled={busy}
                            onClick={runCutout}
                          >
                            <Sparkles size={17} />
                            {draft.cutout ? "重新抠图" : "自动抠图"}
                          </button>
                          {draft.cutout && (
                            <div className="segmented cutout-compare">
                              <button
                                className={draft.showOriginal ? "selected" : ""}
                                onClick={() =>
                                  setDraft({ ...draft, showOriginal: true })
                                }
                              >
                                查看原图
                              </button>
                              <button
                                className={
                                  !draft.showOriginal ? "selected" : ""
                                }
                                onClick={() =>
                                  setDraft({ ...draft, showOriginal: false })
                                }
                              >
                                查看抠图
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {draft.cutoutError && (
                        <p className="form-error" role="alert">
                          {draft.cutoutError}。可以重试，或保留原图继续。
                        </p>
                      )}
                      <div className="prototype-note">
                        <Layers size={18} />
                        <p>
                          原始照片始终保留。主体与手可能被一起识别，透明、反光物品也可能需要重拍。画笔和一键去手尚未接入。
                        </p>
                      </div>
                      <button
                        className="primary full"
                        onClick={async () => setStep(2)}
                      >
                        {draft.cutout ? "确认主体并继续" : "保留原图继续"}{" "}
                        <ArrowRight size={16} />
                      </button>
                      <button
                        className="text-button"
                        onClick={async () => setStep(0)}
                      >
                        换一张照片
                      </button>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <h1>给它一个位置。</h1>
                      <p>系列里放着相似的物品，或同一段时光。</p>
                      <div className="collection-choices">
                        {data.collections.map((c) => (
                          <button
                            disabled={!canAdd(data, c.id)}
                            className={
                              draft.collectionId === c.id ? "selected" : ""
                            }
                            key={c.id}
                            onClick={async () =>
                              setDraft({ ...draft, collectionId: c.id })
                            }
                          >
                            <span className={`mini-book book-${c.color}`}>
                              <BookOpen size={20} />
                            </span>
                            <div>
                              <b>{c.name}</b>
                              <small>
                                {c.mode === "complete"
                                  ? `${collectionItems(data, c.id).length} / ${c.total} 件${!canAdd(data, c.id) ? " · 已集齐" : ""}`
                                  : `已收录 ${collectionItems(data, c.id).length} 件`}
                              </small>
                            </div>
                            {draft.collectionId === c.id ? (
                              <span className="radio checked">
                                <Check size={12} />
                              </span>
                            ) : (
                              <span className="radio" />
                            )}
                          </button>
                        ))}
                      </div>
                      <button className="add-inline" onClick={openCreate}>
                        <Plus size={16} />
                        新建一本图鉴
                      </button>
                      <div className="capture-style">
                        <span>
                          <Layers size={16} />
                          沿用系列容器风格
                        </span>
                        <small>
                          {styles.find(
                            (s) =>
                              s[0] ===
                              data.collections.find(
                                (c) => c.id === draft.collectionId,
                              )?.container,
                          )?.[1] || "纸间收藏"}
                        </small>
                      </div>
                      <button
                        className="primary full"
                        disabled={!canAdd(data, draft.collectionId)}
                        onClick={async () => setStep(3)}
                      >
                        放进这本图鉴 <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <div className="draft-preview">
                        <ObjectImage item={draft} />
                        <div>
                          <span>即将收进</span>
                          <b>
                            {
                              data.collections.find(
                                (c) => c.id === draft.collectionId,
                              )?.name
                            }
                          </b>
                          <small>{prettyDate(draft.date)}</small>
                        </div>
                        <CheckCheck size={20} />
                      </div>
                      <h1>故事，可以慢慢写。</h1>
                      <p>下面都可以不填，先收起来也很好。</p>
                      <label className="field">
                        给它起个名字 <span>选填</span>
                        <input
                          value={draft.name}
                          maxLength={40}
                          onChange={(e) =>
                            setDraft({ ...draft, name: e.target.value })
                          }
                          placeholder="比如：京都带回的小杯子"
                        />
                      </label>
                      <label className="field">
                        一句话故事 <span>选填</span>
                        <textarea
                          value={draft.story}
                          maxLength={2000}
                          onChange={(e) =>
                            setDraft({ ...draft, story: e.target.value })
                          }
                          placeholder="它为什么对你很特别？"
                          rows={4}
                        />
                      </label>
                      <details className="more-fields">
                        <summary>
                          再记一点 <Plus size={15} />
                        </summary>
                        <label className="field">
                          它从哪里来
                          <select
                            value={draft.source}
                            onChange={(e) =>
                              setDraft({ ...draft, source: e.target.value })
                            }
                          >
                            <option value="">暂时不填</option>
                            {["自己买的", "别人送的", "捡到的", "传家的"].map(
                              (s) => (
                                <option key={s}>{s}</option>
                              ),
                            )}
                          </select>
                        </label>
                        <span className="field-label">想起它时的心情</span>
                        <div className="filter-tags">
                          {["旅行", "日常", "纪念", "礼物", "快乐", "自然"].map(
                            (t) => (
                              <button
                                key={t}
                                className={
                                  draft.tags.includes(t) ? "selected" : ""
                                }
                                onClick={async () =>
                                  setDraft({
                                    ...draft,
                                    tags: draft.tags.includes(t)
                                      ? draft.tags.filter((x) => x !== t)
                                      : [...draft.tags, t],
                                  })
                                }
                              >
                                {t}
                              </button>
                            ),
                          )}
                        </div>
                        <div className="rating">
                          <span>喜欢程度</span>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              aria-label={`喜欢程度 ${n}`}
                              key={n}
                              onClick={async () =>
                                setDraft({
                                  ...draft,
                                  rating: draft.rating === n ? 0 : n,
                                })
                              }
                            >
                              <Heart
                                size={21}
                                fill={draft.rating >= n ? "#647d68" : "none"}
                                color="#647d68"
                              />
                            </button>
                          ))}
                        </div>
                      </details>
                      <button
                        className="generation-row"
                        onClick={async () => setModal({ type: "generation" })}
                      >
                        <Sparkles size={18} />
                        <span>
                          试试物品风格化<small>高级功能 · 稍后也可以</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                      <button className="primary full" onClick={submitItem}>
                        收进图鉴 <BookOpen size={17} />
                      </button>
                      <p className="privacy-hint">
                        保存原始照片 · 不消耗生成额度
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => readPhoto(e.target.files[0])}
                />
              </>
            )}
          </main>
          {route.page !== "capture" && nav}
          <div className="home-indicator" />
          {toast && (
            <div className="toast" role="status">
              <Check size={15} />
              {toast}
            </div>
          )}
          {modal && (
            <div
              className="modal-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setModal(null);
              }}
            >
              <section
                className="bottom-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                ref={modalRef}
              >
                <div className="sheet-handle" />
                <IconButton
                  label="关闭弹窗"
                  className="sheet-close"
                  onClick={async () => setModal(null)}
                >
                  <X size={19} />
                </IconButton>
                {modal.type === "collection" && (
                  <>
                    <span className="eyebrow">
                      A PLACE FOR YOUR LITTLE THINGS
                    </span>
                    <h2 id="modal-title">新的一本，从这里开始。</h2>
                    <p>收藏没有标准，喜欢就好。</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const error = validateCollection(
                          modal.name,
                          modal.mode,
                          modal.total,
                        );
                        if (error) {
                          setModal({ ...modal, error });
                          return;
                        }
                        const c = {
                          id: crypto.randomUUID(),
                          name: modal.name.trim(),
                          mode: modal.mode,
                          total:
                            modal.mode === "complete"
                              ? Number(modal.total)
                              : undefined,
                          color: modal.color,
                          container: "paper",
                        };
                        if (
                          await save({
                            ...data,
                            collections: [...data.collections, c],
                          })
                        ) {
                          setModal(null);
                          if (route.page === "capture")
                            setDraft({ ...draft, collectionId: c.id });
                          else openCollection(c.id);
                          notify("新的图鉴，等一个故事");
                        }
                      }}
                    >
                      <label className="field">
                        系列名称
                        <input
                          autoFocus
                          maxLength={20}
                          value={modal.name}
                          placeholder="想把什么收在一起？"
                          onChange={(e) =>
                            setModal({
                              ...modal,
                              name: e.target.value,
                              error: "",
                            })
                          }
                        />
                      </label>
                      <span className="field-label">用什么方式收藏</span>
                      <div className="mode-choices">
                        <button
                          type="button"
                          className={modal.mode === "free" ? "selected" : ""}
                          onClick={async () =>
                            setModal({ ...modal, mode: "free" })
                          }
                        >
                          <Leaf size={18} />
                          <b>自由模式</b>
                          <small>随心收录，没有终点</small>
                        </button>
                        <button
                          type="button"
                          className={
                            modal.mode === "complete" ? "selected" : ""
                          }
                          onClick={async () =>
                            setModal({ ...modal, mode: "complete" })
                          }
                        >
                          <Grid2X2 size={18} />
                          <b>集齐模式</b>
                          <small>知道总数，慢慢集齐</small>
                        </button>
                      </div>
                      {modal.mode === "complete" && (
                        <label className="field">
                          一共有多少件
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={modal.total}
                            onChange={(e) =>
                              setModal({
                                ...modal,
                                total: e.target.value,
                                error: "",
                              })
                            }
                          />
                        </label>
                      )}
                      <span className="field-label">选一个封面颜色</span>
                      <div className="color-options">
                        {[
                          "mint",
                          "butter",
                          "linen",
                          "sage",
                          "rose",
                          "blue",
                        ].map((c) => (
                          <button
                            type="button"
                            key={c}
                            className={`book-${c} ${modal.color === c ? "selected" : ""}`}
                            aria-label={`封面颜色 ${c}`}
                            onClick={async () =>
                              setModal({ ...modal, color: c })
                            }
                          >
                            {modal.color === c && <Check size={17} />}
                          </button>
                        ))}
                      </div>
                      {modal.error && (
                        <p className="form-error" role="alert">
                          {modal.error}
                        </p>
                      )}
                      <button className="primary full" type="submit">
                        <Plus size={17} />
                        创建这本图鉴
                      </button>
                    </form>
                  </>
                )}
                {modal.type === "style" && (
                  <>
                    <span className="eyebrow">MAKE IT FEEL LIKE YOU</span>
                    <h2 id="modal-title">换一种方式珍藏</h2>
                    <p>容器风格统一应用到这本系列，免费切换。</p>
                    <div className="style-options">
                      {styles.map(([id, name, desc]) => (
                        <button
                          className={
                            data.collections.find((c) => c.id === modal.id)
                              ?.container === id
                              ? "selected"
                              : ""
                          }
                          key={id}
                          onClick={async () =>
                            await save({
                              ...data,
                              collections: data.collections.map((c) =>
                                c.id === modal.id ? { ...c, container: id } : c,
                              ),
                            })
                          }
                        >
                          <span className={`style-swatch container-${id}`}>
                            <ObjectImage
                              item={
                                collectionItems(data, modal.id)[0] || {
                                  asset: 0,
                                }
                              }
                            />
                          </span>
                          <div>
                            <b>{name}</b>
                            <small>{desc}</small>
                          </div>
                          {data.collections.find((c) => c.id === modal.id)
                            ?.container === id && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                    <button
                      className="generation-row"
                      onClick={async () => setModal({ type: "generation" })}
                    >
                      <Sparkles size={17} />
                      <span>
                        物品本身，也可以换画风<small>原始图片始终保留</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      className="primary full"
                      onClick={async () => setModal(null)}
                    >
                      就用这个风格 <Check size={17} />
                    </button>
                  </>
                )}
                {modal.type === "generation" && (
                  <>
                    <div className="modal-symbol">
                      <Sparkles size={29} strokeWidth={1.3} />
                    </div>
                    <h2 id="modal-title">给物品，另一种模样。</h2>
                    <p>
                      黏土潮玩、二次元卡通、手绘水彩。
                      <br />
                      原图始终保留，随时都能切回来。
                    </p>
                    <div className="generation-styles">
                      {["黏土潮玩", "二次元卡通", "手绘水彩"].map((n, i) => (
                        <div key={n}>
                          <span>{["柔软立体", "轻快线条", "纸上色彩"][i]}</span>
                          <b>{n}</b>
                          <small>保真度待实测</small>
                        </div>
                      ))}
                    </div>
                    <div className="prototype-note">
                      <ShieldCheck size={18} />
                      <p>
                        当前原型尚未连接生成服务，不上传照片、不扣额度。正式版本生成前会说明上传用途，并征得你的同意。
                      </p>
                    </div>
                    <button
                      className="primary full"
                      onClick={async () => setModal(null)}
                    >
                      先保留本来的样子
                    </button>
                  </>
                )}
                {modal.type === "cutout-info" && (
                  <>
                    <div className="modal-symbol">
                      <Layers size={29} />
                    </div>
                    <h2 id="modal-title">保留完整的那一刻</h2>
                    <p>
                      请安装 iOS 或 Android App
                      使用设备端离线抠图。浏览器展示原始素材，原生
                      版本会提供主体点选、画笔和一键去手，确认后再生成抠图版本。
                    </p>
                    <button
                      className="primary full"
                      onClick={async () => setModal(null)}
                    >
                      继续查看原图
                    </button>
                  </>
                )}
                {modal.type === "share" && (
                  <>
                    <span className="eyebrow">A LITTLE STORY TO SHARE</span>
                    <h2 id="modal-title">把这一页，分享出去。</h2>
                    <div className="share-preview">
                      <span>人生图鉴 / {modal.collection.name}</span>
                      {modal.item ? (
                        <>
                          <ObjectImage item={modal.item} />
                          <h3>{modal.item.name || "未命名物品"}</h3>
                          {shareOptions.story && <p>{modal.item.story}</p>}
                          {shareOptions.date && (
                            <time>{prettyDate(modal.item.date)}</time>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="poster-grid">
                            {collectionItems(data, modal.collection.id).map(
                              (i) => (
                                <ObjectImage key={i.id} item={i} />
                              ),
                            )}
                          </div>
                          <h3>{modal.collection.name}</h3>
                          <small>
                            已收录{" "}
                            {collectionItems(data, modal.collection.id).length}{" "}
                            件
                          </small>
                        </>
                      )}
                    </div>
                    {modal.item && (
                      <div className="share-toggles">
                        <label>
                          <input
                            type="checkbox"
                            checked={shareOptions.story}
                            onChange={(e) =>
                              setShareOptions({
                                ...shareOptions,
                                story: e.target.checked,
                              })
                            }
                          />
                          带上故事
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={shareOptions.date}
                            onChange={(e) =>
                              setShareOptions({
                                ...shareOptions,
                                date: e.target.checked,
                              })
                            }
                          />
                          显示日期
                        </label>
                      </div>
                    )}
                    <p className="privacy-hint">仅导出图片，不会公开你的图鉴</p>
                    <button
                      className="primary full"
                      disabled={busy}
                      onClick={exportShare}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Download size={17} />
                      )}
                      保存{modal.item ? "物品卡片" : "系列海报"}
                    </button>
                  </>
                )}
                {modal.type === "edit" && (
                  <>
                    <h2 id="modal-title">再记下一点点</h2>
                    <label className="field">
                      名称
                      <input
                        maxLength={40}
                        value={modal.name}
                        onChange={(e) =>
                          setModal({ ...modal, name: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      它的故事
                      <textarea
                        rows={5}
                        maxLength={2000}
                        value={modal.story}
                        onChange={(e) =>
                          setModal({ ...modal, story: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      收录日期
                      <input
                        type="date"
                        required
                        value={modal.date}
                        onChange={(e) =>
                          setModal({ ...modal, date: e.target.value })
                        }
                      />
                    </label>
                    <button
                      className="primary full"
                      disabled={!modal.date}
                      onClick={async () => {
                        const { type, ...updated } = modal;
                        if (
                          await save({
                            ...data,
                            items: data.items.map((i) =>
                              i.id === updated.id ? updated : i,
                            ),
                          })
                        ) {
                          setModal(null);
                          notify("故事已经好好记下");
                        }
                      }}
                    >
                      保存记录 <Check size={17} />
                    </button>
                  </>
                )}
                {["storage", "privacy", "default-style"].includes(
                  modal.type,
                ) && (
                  <>
                    <div className="modal-symbol">
                      {modal.type === "storage" ? (
                        <Cloud size={28} />
                      ) : modal.type === "privacy" ? (
                        <ShieldCheck size={28} />
                      ) : (
                        <BookOpen size={28} />
                      )}
                    </div>
                    <h2 id="modal-title">
                      {modal.type === "storage"
                        ? "好好保管这些记忆"
                        : modal.type === "privacy"
                          ? "只属于你的生活图鉴"
                          : "纸间收藏 · 白底版"}
                    </h2>
                    <p>
                      {modal.type === "storage"
                        ? "记录保存在此设备的本地数据库中；清理浏览器数据会移除它们。你可以在「我的」导出 JSON 备份。iCloud 同步尚未接入。"
                        : modal.type === "privacy"
                          ? "当前原型不会上传你的照片和故事，没有公开主页。导出分享图片由你主动选择，故事与日期可以隐藏。"
                          : "新建系列默认采用白色页面、纸张封面与柔和投影。你可以在各系列的风格设置里，免费切换容器样式。"}
                    </p>
                    <button
                      className="primary full"
                      onClick={async () => setModal(null)}
                    >
                      知道了
                    </button>
                  </>
                )}
                {modal.type === "exit-capture" && (
                  <>
                    <h2 id="modal-title">这件物品，还没收进图鉴。</h2>
                    <p>可以继续填写，或者放弃这次收录。</p>
                    <button
                      className="primary full"
                      onClick={async () => setModal(null)}
                    >
                      继续收录
                    </button>
                    <button
                      className="text-button"
                      onClick={async () => {
                        setDraft(null);
                        back();
                      }}
                    >
                      放弃本次收录
                    </button>
                  </>
                )}
                {["empty-confirm", "reset-confirm"].includes(modal.type) && (
                  <>
                    <h2 id="modal-title">
                      {modal.type === "empty-confirm"
                        ? "体验从零开始的图鉴？"
                        : "恢复示例内容？"}
                    </h2>
                    <p>
                      这会替换此设备里现有的所有记录。建议先导出备份；恢复示例不会找回你导入的照片。
                    </p>
                    <button className="secondary full" onClick={exportBackup}>
                      先导出当前备份
                    </button>
                    <button
                      className="primary full"
                      onClick={async () => {
                        const next =
                          modal.type === "empty-confirm"
                            ? {
                                version: 1,
                                collections: seedData().collections.filter(
                                  (c) => c.id === "casual",
                                ),
                                items: [],
                              }
                            : seedData();
                        if (await save(next)) {
                          home();
                          notify("图鉴已经准备好了");
                        }
                      }}
                    >
                      {modal.type === "empty-confirm"
                        ? "确认，体验空态"
                        : "确认，恢复示例"}
                    </button>
                  </>
                )}
              </section>
            </div>
          )}
          {busy && !modal && (
            <div className="busy-overlay">
              <LoaderCircle className="spin" />
              正在本机处理照片，请稍候…
            </div>
          )}
        </div>
        <div className="device-caption">
          <span className="live-dot" /> 可交互预览 <span>·</span>{" "}
          所有记录默认私有
        </div>
      </div>
      <aside className="studio-margin">
        <span>把物品留下</span>
        <i />
        <span>也把故事留下</span>
      </aside>
    </div>
  );
}
loadCatalog()
  .then((initialData) =>
    createRoot(document.getElementById("root")).render(
      <App initialData={initialData} />,
    ),
  )
  .catch((error) => {
    const root = document.getElementById("root");
    root.textContent = error.message;
    root.style.padding = "32px";
  });
