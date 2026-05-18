from __future__ import annotations

import hashlib
import os
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests

DEFAULT_CHROMA_PATH = "/home/jetson/remote_vector_db"
DEFAULT_COLLECTION_NAME = "medical_knowledge"
_ollama_host = os.getenv("MDTS_OLLAMA_HOST", os.getenv("OLLAMA_HOST", "127.0.0.1")).strip() or "127.0.0.1"
_ollama_port = int(os.getenv("MDTS_OLLAMA_PORT", os.getenv("OLLAMA_PORT", "11434")))
DEFAULT_EMBED_URL = f"http://{_ollama_host.replace('http://', '').replace('https://', '').split('/')[0].split(':')[0]}:{_ollama_port}/api/embeddings"
DEFAULT_EMBED_MODEL = "nomic-embed-text"
DEFAULT_OBSIDIAN_DIR = os.environ.get("MDTS_OBSIDIAN_DIR", "")
DEFAULT_OBSIDIAN_EXT = ".md"
DEFAULT_OBSIDIAN_SYNC_SEC = 180
DEFAULT_CHUNK_SIZE = 420
DEFAULT_CHUNK_OVERLAP = 50


class MedicalKnowledgeEngine:
    """
    MDTS용 지식 엔진.
    - ChromaDB 영구 컬렉션을 사용해 RAG 검색
    - Ollama 임베딩 API를 사용해 모델 종속성 제거
    - 옵시디언(또는 Markdown 노트 저장소) 자동 동기화 지원
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        collection_name: Optional[str] = None,
        embed_url: Optional[str] = None,
        embed_model: Optional[str] = None,
        auto_sync_obsidian: bool = False,
        obsidian_dir: Optional[str] = None,
        obsidian_sync_seconds: Optional[int] = None,
    ) -> None:
        self.db_path = db_path or os.getenv("MDTS_CHROMA_PATH", DEFAULT_CHROMA_PATH)
        self.collection_name = collection_name or os.getenv("MDTS_COLLECTION", DEFAULT_COLLECTION_NAME)
        self.embed_url = embed_url or os.getenv("MDTS_EMBED_URL", DEFAULT_EMBED_URL)
        self.embed_model = embed_model or os.getenv("MDTS_EMBED_MODEL", DEFAULT_EMBED_MODEL)
        self.chunk_size = DEFAULT_CHUNK_SIZE
        self.chunk_overlap = DEFAULT_CHUNK_OVERLAP

        # 실제 의존성은 외부 임베딩 API + ChromaDB 네이티브 클라이언트.
        import chromadb  # local import: Jetson 의존성 경량화

        self.client = chromadb.PersistentClient(path=self.db_path)
        self.collection = self.client.get_or_create_collection(name=self.collection_name)
        self._lock = threading.Lock()
        self._sync_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._last_sync: Dict[str, Dict[str, int]] = {}

        print(f"[*] Vector DB loaded: path={self.db_path}, collection={self.collection_name}")

        if auto_sync_obsidian:
            resolved_dir = obsidian_dir or DEFAULT_OBSIDIAN_DIR
            if resolved_dir:
                interval_seconds = obsidian_sync_seconds or DEFAULT_OBSIDIAN_SYNC_SEC
                self.start_obsidian_auto_sync(resolved_dir, interval_seconds)

    def _split_text(self, text: str) -> List[str]:
        if not text.strip():
            return []

        chunks: List[str] = []
        start = 0
        normalized = " ".join(text.splitlines())
        total = len(normalized)
        window = self.chunk_size
        overlap = self.chunk_overlap

        while start < total:
            end = min(start + window, total)
            chunks.append(normalized[start:end].strip())
            if end == total:
                break
            start = max(0, end - overlap)

        return [chunk for chunk in chunks if chunk]

    def _make_ids_and_docs(
        self,
        source: str,
        source_name: str,
        source_mtime: int,
        source_text: str,
    ) -> List[tuple[str, str, Dict[str, str]]]:
        chunk_texts = self._split_text(source_text)
        outputs: List[tuple[str, str, Dict[str, str]]] = []

        for idx, chunk in enumerate(chunk_texts):
            chunk_hash = hashlib.sha1(f"{source}:{idx}:{chunk}".encode("utf-8")).hexdigest()
            doc_id = f"obsidian::{source_name}::{chunk_hash}"
            metadata = {
                "source_type": "obsidian",
                "source": source_name,
                "chunk": str(idx),
                "mtime": str(source_mtime),
            }
            outputs.append((doc_id, chunk, metadata))

        return outputs

    def _read_markdown_file(self, file_path: str) -> Optional[str]:
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                return file.read()
        except Exception as exc:
            print(f"[!] Failed to read markdown file: {file_path} / {exc}")
            return None

    def _collect_markdown_docs(self, directory: str) -> tuple[List[str], List[str], List[Dict[str, str]]]:
        if not directory or not os.path.isdir(directory):
            print(f"[!] Obsidian sync target is invalid: {directory}")
            return [], [], []

        base = os.path.abspath(directory)
        all_files = sorted(str(p) for p in Path(base).rglob(f"*{DEFAULT_OBSIDIAN_EXT}"))
        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, str]] = []
        changed = 0
        skipped = 0

        for file_path in all_files:
            content = self._read_markdown_file(file_path)
            if content is None or not content.strip():
                continue

            source_name = os.path.relpath(file_path, base).replace("\\", "/")
            source_mtime = int(os.path.getmtime(file_path))
            source_hash = hashlib.sha1(content.encode("utf-8")).hexdigest()
            prev = self._last_sync.get(source_name, {})
            if prev.get("mtime") == source_mtime and prev.get("hash") == source_hash:
                skipped += 1
            else:
                changed += 1
                self._last_sync[source_name] = {
                    "mtime": source_mtime,
                    "hash": source_hash,
                }

            for doc_id, doc_text, metadata in self._make_ids_and_docs(file_path, source_name, source_mtime, content):
                ids.append(doc_id)
                documents.append(doc_text)
                metadatas.append(metadata)

        existing_obsidian = self.collection.get(where={"source_type": "obsidian"}, include=["ids"])
        if existing_obsidian and existing_obsidian.get("ids"):
            with self._lock:
                try:
                    self.collection.delete(ids=existing_obsidian["ids"])
                    self.collection.add(ids=ids, documents=documents, metadatas=metadatas)
                except Exception:
                    # 호환성: 특정 Chroma API 버전에서 add가 실패할 때는 upsert 사용
                    for idx, doc_id in enumerate(ids):
                        try:
                            self.collection.upsert(
                                ids=[doc_id],
                                documents=[documents[idx]],
                                metadatas=[metadatas[idx]],
                            )
                        except Exception as inner_exc:
                            print(f"[!] Failed to store doc id={doc_id}: {inner_exc}")
        else:
            with self._lock:
                if ids:
                    try:
                        self.collection.add(ids=ids, documents=documents, metadatas=metadatas)
                    except Exception as exc:
                        print(f"[!] Initial add failed, try upsert: {exc}")
                        for idx, doc_id in enumerate(ids):
                            self.collection.upsert(
                                ids=[doc_id],
                                documents=[documents[idx]],
                                metadatas=[metadatas[idx]],
                            )

        print(f"[*] Obsidian markdown sync done. updated={changed}, skipped={skipped}, total_docs={len(documents)}")
        return ids, documents, metadatas

    def sync_obsidian_once(self, obsidian_dir: str) -> Dict[str, int]:
        _, docs, _ = self._collect_markdown_docs(obsidian_dir)
        return {
            "status": "ok",
            "count": len(docs),
            "source": obsidian_dir,
        }

    def _observer_loop(self, directory: str, interval: int) -> None:
        while not self._stop_event.is_set():
            try:
                self.sync_obsidian_once(directory)
            except Exception as exc:
                print(f"[!] Obsidian auto-sync failed: {exc}")
            time.sleep(max(30, interval))

    def start_obsidian_auto_sync(self, directory: str, interval: int = DEFAULT_OBSIDIAN_SYNC_SEC) -> None:
        if self._sync_thread and self._sync_thread.is_alive():
            return
        self._stop_event.clear()
        self._sync_thread = threading.Thread(
            target=self._observer_loop,
            args=(directory, interval),
            daemon=True,
            name="mdts-obsidian-sync",
        )
        self._sync_thread.start()
        print(f"[*] Auto-sync for Obsidian markdown started: dir={directory}, interval={interval}s")

    def stop(self) -> None:
        self._stop_event.set()
        if self._sync_thread and self._sync_thread.is_alive():
            self._sync_thread.join(timeout=2.0)

    def _get_embedding(self, text: str) -> Optional[List[float]]:
        try:
            response = requests.post(
                self.embed_url,
                json={"model": self.embed_model, "prompt": text[:700], "keep_alive": "10s"},
                timeout=10,
            )
            if response.status_code != 200:
                print(f"[!] Embedding request failed: {response.status_code} / {response.text}")
                return None
            payload = response.json()
            embedding = payload.get("embedding")
            if isinstance(embedding, list):
                return embedding
        except Exception as exc:
            print(f"[!] Embedding generation failed: {exc}")
        return None

    def search_relevant_docs(self, query: str, k: int = 2) -> str:
        if not query:
            return ""
        query_embedding = self._get_embedding(query)
        if query_embedding is None:
            return ""

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=max(1, k),
                include=["documents", "metadatas", "distances"],
            )
            docs = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
            if not docs:
                return ""

            formatted_docs: List[str] = []
            for idx, doc in enumerate(docs):
                metadata = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
                distance = distances[idx] if idx < len(distances) else None
                source = metadata.get("source") or metadata.get("file") or metadata.get("title") or "unknown"
                source_type = metadata.get("source_type") or "chroma"
                distance_text = f", distance={distance:.4f}" if isinstance(distance, (int, float)) else ""
                formatted_docs.append(
                    f"[ChromaDB RAG: source_type={source_type}, source={source}{distance_text}]\n{str(doc)}"
                )
            return "\n\n".join(formatted_docs)
        except Exception as exc:
            print(f"[!] Chroma search failed: {exc}")
            return ""


if __name__ == "__main__":
    engine = MedicalKnowledgeEngine()
    print(engine.search_relevant_docs("심정지 처치"))
