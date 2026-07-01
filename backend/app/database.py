import os
from typing import Generator

from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine

# 读取 backend/.env 文件中的环境变量
load_dotenv()

# 从 .env 中获取数据库连接地址
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL 未配置，请检查 backend/.env 文件")

# 创建数据库连接引擎
engine = create_engine(
    DATABASE_URL,
    echo=True,  # 开发阶段打开，可以在终端看到 SQL 执行过程
)


def create_db_and_tables() -> None:
    """
    创建数据库表。
    后面我们定义的 SQLModel 表，都会通过这个函数自动创建。
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    获取数据库会话。
    后续接口里通过 Depends(get_session) 使用数据库。
    """
    with Session(engine) as session:
        yield session