from src.schema.main import Project

PROJECTS: list[Project] = [
    Project(
        key="trustdecision-portal",
        name="TrustDecision客户平台",
        description="一个风控类型的客户平台，用于客户管理数据",
    ),
    Project(
        key="trustdecision-oper",
        name="TrustDecision运营平台",
        description="一个风控类型的运营平台，用于运营管理数据和操作",
    ),
    Project(
        key="aicube",
        name="AiCube规则智能助手",
        description="客户通过自然语言提交规则配置需求，智能助手通过分析后，返回可配置的规则列表",
    ),
]
