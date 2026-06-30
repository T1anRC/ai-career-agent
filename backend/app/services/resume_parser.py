from fastapi import UploadFile
from pypdf import PdfReader
from docx import Document
import io


async def parse_resume_file(file: UploadFile) -> str:
    """
    解析用户上传的简历文件，支持 txt、pdf、docx。
    返回解析出来的纯文本内容。
    """

    filename = file.filename or ""

    if "." not in filename:
        raise ValueError("文件缺少后缀名，请上传 txt、pdf 或 docx 文件。")

    file_ext = filename.lower().split(".")[-1]

    if file_ext not in ["txt", "pdf", "docx"]:
        raise ValueError("暂时只支持 txt、pdf、docx 格式的简历文件。")

    file_bytes = await file.read()

    if not file_bytes:
        raise ValueError("上传的文件内容为空。")

    if file_ext == "txt":
        return parse_txt(file_bytes)

    if file_ext == "pdf":
        return parse_pdf(file_bytes)

    if file_ext == "docx":
        return parse_docx(file_bytes)

    raise ValueError("文件解析失败。")


def parse_txt(file_bytes: bytes) -> str:
    """
    解析 txt 文件。
    优先按 utf-8 解码，如果失败再尝试 gbk。
    """

    for encoding in ["utf-8", "gbk"]:
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise ValueError("txt 文件编码无法识别，请尝试保存为 UTF-8 编码。")


def parse_pdf(file_bytes: bytes) -> str:
    """
    解析 PDF 文件。
    注意：如果 PDF 是扫描版图片，这里可能解析不到文字。
    """

    pdf_stream = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_stream)

    text_list = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_list.append(page_text)

    text = "\n".join(text_list).strip()

    if not text:
        raise ValueError("PDF 未解析到文字，可能是扫描版 PDF。")

    return text


def parse_docx(file_bytes: bytes) -> str:
    """
    解析 docx 文件。
    """

    docx_stream = io.BytesIO(file_bytes)
    document = Document(docx_stream)

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if text:
            paragraphs.append(text)

    text = "\n".join(paragraphs).strip()

    if not text:
        raise ValueError("docx 文件未解析到文字。")

    return text