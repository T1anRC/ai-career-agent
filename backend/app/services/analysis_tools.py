import re
from typing import List, Dict


def extract_keywords(text: str, keywords: List[str]) -> List[str]:
    """
    从文本中提取命中的关键词。
    这是最基础的关键词匹配工具，后面可以继续升级。
    """
    if not text:
        return []

    lower_text = text.lower()
    matched_keywords = []

    for keyword in keywords:
        if keyword.lower() in lower_text:
            matched_keywords.append(keyword)

    return matched_keywords


def calculate_resume_structure_score(resume_text: str) -> Dict:
    """
    简历结构评分工具。
    根据简历中是否包含常见模块，给出一个简单结构评分。
    """
    sections = {
        "基本信息": ["姓名", "电话", "邮箱", "手机号"],
        "教育经历": ["教育经历", "学校", "专业", "本科", "学历"],
        "项目经历": ["项目经历", "项目经验", "项目内容", "工作内容", "项目成果"],
        "技能": ["专业技能", "相关技能", "技术栈", "技能"],
        "自我评价": ["自我评价", "个人优势", "个人总结"],
    }

    result = {}
    total_score = 0

    for section_name, keywords in sections.items():
        matched = extract_keywords(resume_text, keywords)
        has_section = len(matched) > 0

        result[section_name] = {
            "has_section": has_section,
            "matched_keywords": matched,
        }

        if has_section:
            total_score += 20

    return {
        "score": total_score,
        "max_score": 100,
        "details": result,
    }


def extract_jd_keywords(jd_text: str) -> Dict:
    """
    JD 关键词提取工具。
    先用固定关键词表做规则匹配，后续可以升级为模型提取。
    """
    keyword_groups = {
        "编程语言": ["Python", "Java", "C++", "JavaScript", "TypeScript", "C#", "Go"],
        "前端技术": ["React", "Next.js", "Vue", "HTML", "CSS", "Tailwind"],
        "后端技术": ["FastAPI", "Spring Boot", "Django", "Flask", "MyBatis", "RESTful API"],
        "AI 技术": ["AI", "大模型", "LLM", "RAG", "Agent", "Prompt", "向量数据库", "知识库"],
        "数据库": ["MySQL", "PostgreSQL", "SQLite", "Redis", "MongoDB"],
        "工程工具": ["Git", "Docker", "Linux", "CI/CD", "GitHub"],
        "软性要求": ["沟通", "协作", "学习能力", "责任心", "抗压"],
    }

    result = {}

    for group_name, keywords in keyword_groups.items():
        matched = extract_keywords(jd_text, keywords)
        result[group_name] = matched

    return result


def calculate_keyword_match(resume_text: str, jd_text: str) -> Dict:
    """
    简历与岗位 JD 的关键词匹配工具。
    """
    jd_keywords_result = extract_jd_keywords(jd_text)

    all_jd_keywords = []
    for keywords in jd_keywords_result.values():
        all_jd_keywords.extend(keywords)

    matched_keywords = extract_keywords(resume_text, all_jd_keywords)

    missing_keywords = [
        keyword for keyword in all_jd_keywords
        if keyword not in matched_keywords
    ]

    if len(all_jd_keywords) == 0:
        match_rate = 0
    else:
        match_rate = round(len(matched_keywords) / len(all_jd_keywords) * 100, 1)

    return {
        "match_rate": match_rate,
        "jd_keywords": all_jd_keywords,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
    }


def analyze_resume_with_tools(resume_text: str, jd_text: str = "") -> Dict:
    """
    Tool Calling V1 总入口。
    后端调用这个函数，就能拿到结构化分析结果。
    """

    called_tools = []

    structure_score = calculate_resume_structure_score(resume_text)
    called_tools.append("calculate_resume_structure_score")

    result = {
        "called_tools": called_tools,
        "resume_structure_score": structure_score,
    }

    if jd_text:
        jd_keywords = extract_jd_keywords(jd_text)
        called_tools.append("extract_jd_keywords")

        keyword_match = calculate_keyword_match(resume_text, jd_text)
        called_tools.append("calculate_keyword_match")

        result["jd_keywords"] = jd_keywords
        result["keyword_match"] = keyword_match

    return result