"""Generate eval review HTML pages for both skills."""
import json

TEMPLATE_PATH = 'Y:/AI/WX-APP-OA/.claude/skills/skill-creator/assets/eval_review.html'

with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
    template = f.read()

skills = [
    {
        'name': 'architectural-foundation',
        'desc': (
            '功能块开发入口。'
            '当用户说"功能块开发"、"新建功能模块"、"开始开发新功能"、"架构基础流程"时触发。'
            '通过四阶段流程（需求探针→主规生成→架构蓝图→基建执行）'
            '产出完整的PRD文档套件到需求/PRD/<功能名>/下。'
        ),
    },
    {
        'name': 'agile-iteration',
        'desc': (
            '快捷迭代入口。'
            '当用户说"快捷"、"迭代"、"增量开发"、"小改一下"、"加个功能"时触发。'
            '基于已有的功能块 PRD 文档和现有代码，通过迭代卡片实现精准增量开发，内建防退化检查。'
        ),
    },
]

for skill in skills:
    eval_path = f'Y:/AI/WX-APP-OA/.claude/skills/{skill["name"]}/workspace/eval_set.json'
    with open(eval_path, 'r', encoding='utf-8') as f:
        eval_data = json.load(f)

    html = template.replace('__SKILL_NAME_PLACEHOLDER__', skill['name'])
    html = html.replace('__SKILL_DESCRIPTION_PLACEHOLDER__', skill['desc'])
    html = html.replace('__EVAL_DATA_PLACEHOLDER__', json.dumps(eval_data, ensure_ascii=False))

    out_path = f'Y:/AI/WX-APP-OA/.claude/skills/{skill["name"]}/workspace/eval_review.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Created: {out_path}')

print('Done')
