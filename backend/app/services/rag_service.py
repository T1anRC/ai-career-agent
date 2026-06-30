from pathlib import Path
import hashlib
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings


# 1. 项目路径配置
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
CHROMA_DIR = BASE_DIR / "chroma_db"


# 2. 一个简单稳定的本地 embedding 函数
# 说明：
# 这里先不用下载 HuggingFace 模型，避免网络问题。
# Day08 先把 RAG 主流程跑通，后面可以再换成更强的 embedding 模型。
class SimpleHashEmbeddingFunction(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []

        for text in input:
            vector = [0.0] * 128

            for char in text:
                index = int(hashlib.md5(char.encode("utf-8")).hexdigest(), 16) % 128
                vector[index] += 1.0

            length = sum(x * x for x in vector) ** 0.5
            if length > 0:
                vector = [x / length for x in vector]

            embeddings.append(vector)

        return embeddings


embedding_function = SimpleHashEmbeddingFunction()


# 3. 初始化 Chroma 本地向量库
client = chromadb.PersistentClient(path=str(CHROMA_DIR))

collection = client.get_or_create_collection(
    name="job_search_knowledge",
    embedding_function=embedding_function,
)


def load_markdown_files() -> list[tuple[str, str]]:
    """
    读取 knowledge 文件夹中的所有 .md 文件。
    返回格式：
    [
        ("文件名", "文件内容"),
        ...
    ]
    """
    files = []

    if not KNOWLEDGE_DIR.exists():
        return files

    for file_path in KNOWLEDGE_DIR.glob("*.md"):
        content = file_path.read_text(encoding="utf-8")
        files.append((file_path.name, content))

    return files


def split_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """
    把长文本切成多个小块。
    chunk_size：每块大约多少字符
    overlap：相邻文本块之间保留一点重叠，避免上下文断掉
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def build_knowledge_base() -> int:
    """
    构建知识库：
    读取 Markdown 文件 → 切分 chunks → 存入 Chroma。
    返回写入的 chunk 数量。
    """
    markdown_files = load_markdown_files()

    all_chunks = []
    all_ids = []
    all_metadatas = []

    for filename, content in markdown_files:
        chunks = split_text(content)

        for index, chunk in enumerate(chunks):
            chunk_id = f"{filename}-{index}"

            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append(
                {
                    "source": filename,
                    "chunk_index": index,
                }
            )

    if not all_chunks:
        return 0

    # 为了避免重复添加，先删除已有 collection，再重新创建
    existing_ids = collection.get().get("ids", [])
    if existing_ids:
        collection.delete(ids=existing_ids)

    collection.add(
        documents=all_chunks,
        ids=all_ids,
        metadatas=all_metadatas,
    )

    return len(all_chunks)


def retrieve_knowledge(query: str, top_k: int = 3) -> str:
    """
    根据用户问题，从知识库中检索最相关的 top_k 个片段。
    返回拼接后的文本，后面会放进 Prompt 里。
    """
    result = collection.query(
        query_texts=[query],
        n_results=top_k,
    )

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]

    if not documents:
        return ""

    context_parts = []

    for doc, metadata in zip(documents, metadatas):
        source = metadata.get("source", "unknown")
        chunk_index = metadata.get("chunk_index", "unknown")

        context_parts.append(
            f"资料来源：{source}，片段：{chunk_index}\n{doc}"
        )

    return "\n\n---\n\n".join(context_parts)